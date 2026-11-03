# Changelog

## [1.1.0](https://github.com/KirillShilets/banking-microservices/compare/v1.0.0...v1.1.0) (2026-11-03)


### Features

* add .env support for microservices Docker setup ([e9a837c](https://github.com/KirillShilets/banking-microservices/commit/e9a837cda218994a236dcff4f67b342df25cee56))
* add frontend microservice ([95f2d0c](https://github.com/KirillShilets/banking-microservices/commit/95f2d0c745c61d5973006b0c7ae35a8e44f2233a))
* add Keycloak authentication and role-based authorization ([9269e0a](https://github.com/KirillShilets/banking-microservices/commit/9269e0a378ad516099c77850ce1f1bd61661c220))
* add outbox messaging and financial operation protection ([cb14361](https://github.com/KirillShilets/banking-microservices/commit/cb143619e5e66db96afcdd02387a67591802d522))
* add RabbitMQ messaging between microservices ([d4a0f61](https://github.com/KirillShilets/banking-microservices/commit/d4a0f61208543c9ac23ead355692f86b30069ee0))
* deploy the platform to Kubernetes with a Helm chart ([14eb4ad](https://github.com/KirillShilets/banking-microservices/commit/14eb4ad028a569290f64255f13e8f7162a5ad1b7))
* deposit now sends notification automatically ([e7df6ce](https://github.com/KirillShilets/banking-microservices/commit/e7df6ce5747634717ea7466dddbcdb655cb7f9c1))
* enable async event handling and retry mechanism across services ([dfadafb](https://github.com/KirillShilets/banking-microservices/commit/dfadafb558f5e5055bd30b49c498680706e6591a))
* **exception-handling:** add global exception handling and validation across services ([1fc9262](https://github.com/KirillShilets/banking-microservices/commit/1fc92625926df880818c8dca9f0efaef52e67c4a))
* implement event-driven communication with RabbitMQ ([96e9f4d](https://github.com/KirillShilets/banking-microservices/commit/96e9f4d6538649dbda568c32b957e96cd9d2456b))
* implement liquibase for db schema management ([238e5bd](https://github.com/KirillShilets/banking-microservices/commit/238e5bd55cd99b2cf9b658cca67db9c02bba00b3))
* improve reliable event and notification delivery ([0dcfc13](https://github.com/KirillShilets/banking-microservices/commit/0dcfc13d77fa620504d8da23e58308a702e3ae6e))
* initial commit ([0b02ad8](https://github.com/KirillShilets/banking-microservices/commit/0b02ad8ac4c2f0f438a61856b85fb0838b337898))
* rework the banking UI and make the kind deployment reproducible ([993e6a6](https://github.com/KirillShilets/banking-microservices/commit/993e6a65ec39f70420cacf51e6c74936393c3445))


### Bug Fixes

* add missing frontend .dockerignore and drop ineffective per-module ones ([163d078](https://github.com/KirillShilets/banking-microservices/commit/163d078f2c10c0f68545a2841c251b773632633d))
* add missing notification route and test security config ([16d47c8](https://github.com/KirillShilets/banking-microservices/commit/16d47c8aa02f5c7ee6615d04a8b1fc3bc36bba27))
* correct account existence check ([3ce3427](https://github.com/KirillShilets/banking-microservices/commit/3ce3427a261d280378607ecef17ff3783388a84f))
* correct notification-service routing and enable email alerts ([0b141f2](https://github.com/KirillShilets/banking-microservices/commit/0b141f2d37ae95a938ce9cb9c486c20e5c93ce8d))
* correct Spring Security config ([c621207](https://github.com/KirillShilets/banking-microservices/commit/c621207c78d383dfb70a9d1d57514f61203acff0))
* improve rabbitmq reliability and remove exposed credentials ([9885993](https://github.com/KirillShilets/banking-microservices/commit/988599364a91317d2c81e91f8fd3afe457215e3d))
* minor improvements in api with db ([#10](https://github.com/KirillShilets/banking-microservices/issues/10)) ([cf3b05d](https://github.com/KirillShilets/banking-microservices/commit/cf3b05db8b03a56d20d47f382236458645a3f3ff))
* return 204(No Content) on account deletion and minor refactor ([8a3fe5b](https://github.com/KirillShilets/banking-microservices/commit/8a3fe5bcbf7e9b60a03aa00b675702668b678291))
* single default bill per account ([5485956](https://github.com/KirillShilets/banking-microservices/commit/548595627258ff810ce8fb39cf14e5d65c860f26))
* update deprecated gateway configuration keys ([f610b62](https://github.com/KirillShilets/banking-microservices/commit/f610b6259cbfe83e165ac7532f7070cc0a192a55))
