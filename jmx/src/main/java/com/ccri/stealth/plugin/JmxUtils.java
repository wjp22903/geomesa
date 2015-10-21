package com.ccri.stealth.plugin;

import javax.management.MBeanServer;
import javax.management.MalformedObjectNameException;
import javax.management.ObjectName;
import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;

public class JmxUtils {
    public static final String DOMAIN = "com.ccri.stealth";
    public static final String PLUGIN_KV = "type=plugin";
    private static MBeanServer mbs = ManagementFactory.getPlatformMBeanServer();

    public static Collection<ObjectName> getBeanNames() {
        try {
            return mbs.queryNames(ObjectName.getInstance(DOMAIN + ":" + PLUGIN_KV + ",*"), null);
        } catch (MalformedObjectNameException e) {
            throw new RuntimeException(e);
        }
    }

    public static List<String> getCss(Collection<ObjectName> beanNames) { return getValues(beanNames, "Css"); }
    public static List<String> getJs(Collection<ObjectName> beanNames) { return getValues(beanNames, "Js"); }
    public static List<String> getPlugins(Collection<ObjectName> beanNames) { return getValues(beanNames, "Plugins"); }

    private static List<String> getValues(Collection<ObjectName> beanNames, String attribute) {
        List<String> response = new ArrayList<String>();
        for (ObjectName name : beanNames) {
            try {
                response.addAll(Arrays.asList((String[]) mbs.getAttribute(name, attribute)));
            } catch (Exception e) {/* ignore */}
        }
        return response;
    }
}
