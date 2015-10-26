package com.ccri.stealth.config;

import com.typesafe.config.Config;
import org.springframework.core.env.PropertySource;

public class TypesafeConfigPropertySource extends PropertySource<Config> {
    private String appContext;

    public TypesafeConfigPropertySource(String appContext) {
        super("TypesafeConfigPropertySource");
        this.appContext = appContext;
    }

    @Override
    public Config getSource() {
        return TypesafeConfig.get(appContext);
    }

    @Override
    public Object getProperty(String s) {
        Config conf = getSource();
        if (conf.hasPath(s)) {
            return conf.getAnyRef(s);
        }
        return null;
    }
}
