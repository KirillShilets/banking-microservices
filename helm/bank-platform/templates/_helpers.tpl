{{/*
Expand the name of the chart.
*/}}
{{- define "bank-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name.
*/}}
{{- define "bank-platform.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Labels applied to every object in the release.
*/}}
{{- define "bank-platform.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: bank-platform
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
environment: {{ .Values.global.environment | quote }}
{{- end }}

{{/*
Immutable selector labels.

NEVER add a mutable value here. Deployment.spec.selector is immutable, so any
change forces a delete and recreate of the Deployment on the next upgrade.

Usage: {{ include "bank-platform.selectorLabels" (dict "name" $name "root" $) }}
*/}}
{{- define "bank-platform.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{/*
Full label set for a single service.

Usage: {{ include "bank-platform.serviceLabels" (dict "name" $name "svc" $svc "root" $) }}
*/}}
{{- define "bank-platform.serviceLabels" -}}
{{ include "bank-platform.labels" .root }}
{{ include "bank-platform.selectorLabels" . }}
app.kubernetes.io/component: {{ .svc.component | default "backend" }}
{{- end }}

{{/*
Resolve a container image reference. Three modes:

  1. svc.image.digest set     -> registry/repository@sha256:...
  2. global.imageRegistry set -> registry/repository:tag
  3. neither                  -> repository:tag   (kind: side-loaded images)

Digest form is preferred in production: a mutable tag like 1.0-SNAPSHOT
identifies nothing, while a digest pins the exact bytes that were tested.

Usage: {{ include "bank-platform.image" (dict "name" $name "svc" $svc "root" $) }}
*/}}
{{- define "bank-platform.image" -}}
{{- $svc := .svc -}}
{{- $registry := $svc.image.registry | default .root.Values.global.imageRegistry -}}
{{- $repository := required (printf "services.%s.image.repository is required" .name) $svc.image.repository -}}
{{- $base := printf "%s/%s" $registry $repository | trimPrefix "/" -}}
{{- if $svc.image.digest -}}
{{- printf "%s@%s" $base $svc.image.digest -}}
{{- else -}}
{{- printf "%s:%s" $base ($svc.image.tag | default .root.Chart.AppVersion) -}}
{{- end -}}
{{- end }}

{{/*
Image pull policy. IfNotPresent for immutable tags, Always for "latest".

Usage: {{ include "bank-platform.imagePullPolicy" (dict "svc" $svc "root" $) }}
*/}}
{{- define "bank-platform.imagePullPolicy" -}}
{{- $svc := .svc -}}
{{- if $svc.image.pullPolicy -}}
{{- $svc.image.pullPolicy -}}
{{- else if eq (toString ($svc.image.tag | default .root.Chart.AppVersion)) "latest" -}}
Always
{{- else -}}
IfNotPresent
{{- end -}}
{{- end }}

{{/*
Name of the Secret holding credentials.

Either global.existingSecret points at a Secret managed out of band (External
Secrets Operator, SOPS, a manual kubectl create), or a name is derived. The
chart never renders credentials itself.

Usage: {{ include "bank-platform.secretName" $ }}
*/}}
{{- define "bank-platform.secretName" -}}
{{- if .Values.global.existingSecret -}}
{{- .Values.global.existingSecret -}}
{{- else -}}
{{- printf "%s-app-secrets" (include "bank-platform.fullname" .) -}}
{{- end -}}
{{- end }}

{{/*
Resolve hostAliases. They live in different keys on purpose: the base values
file leaves global.hostAliases empty so managed environments are unaffected,
while the kind overlay supplies kindHostAliases.

Usage: {{ include "bank-platform.hostAliases" $ }}
*/}}
{{- define "bank-platform.hostAliases" -}}
{{- $aliases := .Values.global.hostAliases | default .Values.kindHostAliases | default list -}}
{{- if $aliases -}}
{{- toYaml $aliases -}}
{{- end -}}
{{- end }}

{{/*
Merge shared probe defaults with the per-service overrides.

deepCopy is essential: mergeOverwrite mutates its destination, and
$root.Values.probes would be corrupted for every subsequent service in the
range loop.

Usage: {{ include "bank-platform.probes" (dict "name" $name "svc" $svc "root" $) }}
*/}}
{{- define "bank-platform.probes" -}}
{{- $merged := mergeOverwrite (deepCopy .root.Values.probes) (.svc.probes | default dict) -}}
{{- toYaml $merged -}}
{{- end }}

{{/*
Resolve resource requests and limits for a service.

Tiers exist because a JVM and nginx differ by an order of magnitude in memory
profile: one shared default would either OOMKill Java or overpay for nginx.

Usage: {{ include "bank-platform.resources" (dict "name" $name "svc" $svc "root" $) }}
*/}}
{{- define "bank-platform.resources" -}}
{{- $tier := ternary .root.Values.resources.gateway .root.Values.resources.spring (eq .name "gateway-service") -}}
{{- if eq .name "frontend" -}}
{{- $tier = .root.Values.resources.frontend -}}
{{- end -}}
{{- $merged := mergeOverwrite (deepCopy $tier) (.svc.resources | default dict) -}}
{{- toYaml $merged -}}
{{- end }}

{{/*
Fail the render early instead of shipping a broken Service or Deployment.

Usage: {{ include "bank-platform.validateServices" $ }}
*/}}
{{- define "bank-platform.validateServices" -}}
{{- range $name, $svc := .Values.services -}}
{{- if $svc.enabled -}}
{{- if not (hasKey $.Values.servicePorts $name) -}}
{{- fail (printf "services.%s is enabled but global.servicePorts.%s is not defined" $name $name) -}}
{{- end -}}
{{- if not $svc.image.repository -}}
{{- fail (printf "services.%s.image.repository is required" $name) -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end }}
