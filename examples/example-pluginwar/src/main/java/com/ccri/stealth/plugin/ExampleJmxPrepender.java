package com.ccri.stealth.plugin;

import org.springframework.stereotype.Component;

@Component
public class ExampleJmxPrepender extends WebPathPrepender {
    public ExampleJmxPrepender() {
        this.rootPath = "/example-pluginwar/";
    }
}
