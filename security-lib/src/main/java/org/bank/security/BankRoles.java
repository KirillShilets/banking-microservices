package org.bank.security;

import java.util.Set;

public final class BankRoles {

    public static final String ADMIN = "admin";
    public static final String EMPLOYEE = "employee";
    public static final String CUSTOMER = "customer";

    public static final Set<String> ASSIGNABLE = Set.of(ADMIN, EMPLOYEE, CUSTOMER);

    private BankRoles() {}
}