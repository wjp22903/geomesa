package com.ccri.stealth.plugin;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.management.MBeanServer;
import javax.management.ObjectName;
import java.lang.management.ManagementFactory;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public abstract class AbstractPluginImpl implements Plugin {
    protected String jmxId = UUID.randomUUID().toString();
    protected List<String> css = Collections.emptyList();
    protected List<String> js = Collections.emptyList();
    protected List<String> plugins = Collections.emptyList();

    protected ObjectName name;
    protected MBeanServer mbs;

    public List<String> getCss() { return css; }
    public void setCss(List<String> css) { this.css = css; }
    public List<String> getJs() { return js; }
    public void setJs(List<String> js) { this.js = js; }
    public List<String> getPlugins() {
        return plugins;
    }

    @PostConstruct
    public void register() {
        try {
            name = ObjectName.getInstance(JmxUtils.DOMAIN + ":" + JmxUtils.PLUGIN_KV + ",id=" + jmxId);
            mbs = ManagementFactory.getPlatformMBeanServer();
            mbs.registerMBean(this, name);
        } catch (Exception e) {
            throw new IllegalStateException("Error registering plugin: " + jmxId, e);
        }
    }

    @PreDestroy
    public void unregister() {
        try {
            mbs.unregisterMBean(name);
        } catch (Exception e) {
            throw new IllegalStateException("Error unregistering plugin: " + jmxId, e);
        }
    }
}
