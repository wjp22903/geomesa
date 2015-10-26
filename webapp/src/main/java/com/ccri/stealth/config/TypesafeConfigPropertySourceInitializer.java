package com.ccri.stealth.config;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.web.context.ConfigurableWebApplicationContext;

public class TypesafeConfigPropertySourceInitializer implements ApplicationContextInitializer<ConfigurableWebApplicationContext> {
    public void initialize(ConfigurableWebApplicationContext configurableWebApplicationContext) {
        configurableWebApplicationContext.getEnvironment().getPropertySources().addLast(
                new TypesafeConfigPropertySource(configurableWebApplicationContext
                        .getServletContext().getContextPath().substring(1)));
    }
}
