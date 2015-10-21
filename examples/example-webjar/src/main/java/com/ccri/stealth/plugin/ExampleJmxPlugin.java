package com.ccri.stealth.plugin;

import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class ExampleJmxPlugin extends AbstractPluginImpl implements Plugin {
    public ExampleJmxPlugin() {
        this.jmxId = "example";
        this.css = Arrays.asList("webjars/example/example.css");
        this.js = Arrays.asList("webjars/example/example.js", "webjars/example/sidebar-template.js");
        this.plugins = Arrays.asList("stealth.example");
    }
}
