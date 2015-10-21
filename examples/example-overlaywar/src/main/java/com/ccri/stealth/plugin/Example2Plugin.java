package com.ccri.stealth.plugin;

import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class Example2Plugin extends AbstractPluginImpl implements Plugin {
    public Example2Plugin() {
        this.jmxId = "example2";
        this.js = Arrays.asList("src/app/example2/example2.js");
        this.plugins = Arrays.asList("stealth.example2");
    }
}
