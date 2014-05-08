package com.ccri.stealth.web;

import org.eclipse.jetty.proxy.ProxyServlet;

import javax.servlet.http.HttpServletRequest;
import java.net.URI;

public class CorsProxyServlet extends ProxyServlet {
    @Override
    protected URI rewriteURI(HttpServletRequest request) {
        String query = request.getQueryString();
        return URI.create((
            request.getPathInfo() +
            ((query != null && !query.isEmpty()) ? ("?" + query) : "")
        ).substring(1));
    }
}