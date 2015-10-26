package com.ccri.stealth.config;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;

import java.util.HashMap;
import java.util.Map;

public class TypesafeConfig {
    private static final String defaultConfPath = "stealth";
    private static Map<String, Config> confMap = new HashMap<String, Config>();

    public static Config get(String appContext) {
        if (!confMap.containsKey(appContext)) {
            Config rootConf = ConfigFactory.load();
            Config conf = rootConf.getConfig(defaultConfPath);
            if (appContext != defaultConfPath && rootConf.hasPath(appContext)) {
                conf = rootConf.getConfig(appContext).withFallback(conf);
            }
            confMap.put(appContext, conf);
        }
        return confMap.get(appContext);
    }
}
