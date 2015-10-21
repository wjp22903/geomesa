package com.ccri.stealth.plugin;

import javax.management.MXBean;
import java.util.List;

@MXBean
public interface Plugin {
    List<String> getCss();
    void setCss(List<String> css);
    List<String> getJs();
    void setJs(List<String> js);
    List<String> getPlugins();
}
