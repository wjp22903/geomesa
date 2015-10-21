package com.ccri.stealth.plugin;

import org.springframework.beans.factory.annotation.Autowired;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

public class WebPathPrepender {
    protected String rootPath = "";
    @Autowired
    private List<Plugin> plugins;

    @PostConstruct
    public void prepend() {
        for (Plugin plugin : plugins) {
            plugin.setCss(prepend(plugin.getCss()));
            plugin.setJs(prepend(plugin.getJs()));
        }
    }

    private List<String> prepend(List<String> original) {
        List<String> modified = new ArrayList<String>();
        for (String o : original) {
            modified.add(rootPath + o);
        }
        return modified;
    }
}
