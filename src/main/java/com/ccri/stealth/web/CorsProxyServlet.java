package com.ccri.stealth.web;

import org.eclipse.jetty.client.Address;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.HttpExchange;
import org.eclipse.jetty.http.HttpURI;
import org.eclipse.jetty.servlets.ProxyServlet;
import org.eclipse.jetty.util.URIUtil;
import org.eclipse.jetty.util.ssl.SslContextFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import java.net.MalformedURLException;
import java.net.URI;

public class CorsProxyServlet extends ProxyServlet {
    private Logger log = LoggerFactory.getLogger(getClass());
    private String keyStorePath = null;
    private String keyStorePassword = null;
    private String trustStorePath = null;
    private String trustStorePassword = null;

    @Override
    public void init(ServletConfig config) throws ServletException {
        keyStorePath = config.getInitParameter("keyStorePath");
        keyStorePassword = config.getInitParameter("keyStorePassword");
        trustStorePath = config.getInitParameter("trustStorePath");
        trustStorePassword = config.getInitParameter("trustStorePassword");
        super.init(config);
    }

    @Override
    protected HttpURI proxyHttpURI(HttpServletRequest request, String uri) throws MalformedURLException {
        String query = request.getQueryString();
        String dest = (URIUtil.encodePath(request.getPathInfo()) +
                ((query != null && !query.isEmpty()) ? ("?" + query) : "")
        ).substring(1);
        log.info("Proxy to: " + dest);
        return new HttpURI(URI.create(dest));
    }

    @Override
    protected HttpClient createHttpClientInstance() {
        if (keyStorePath != null && keyStorePath.trim().length() > 0 && trustStorePath != null && trustStorePath.trim().length() > 0) {
            SslContextFactory ssl = new SslContextFactory();
            ssl.setKeyStorePath(keyStorePath);
            ssl.setKeyStorePassword(keyStorePassword);
            ssl.setTrustStore(trustStorePath);
            ssl.setTrustStorePassword(trustStorePassword);
            return new HttpClient(ssl);
        }
        return super.createHttpClientInstance();
    }

    @Override
    protected HttpClient createHttpClient(ServletConfig config) throws Exception {
        HttpClient client = super.createHttpClient(config);

        String t = config.getInitParameter("proxy");
        if (t != null && t.trim().length() > 0) {
            client.setProxy(Address.from(t));
        }
        t = config.getInitParameter("connectTimeout");
        if (t != null) {
            client.setConnectTimeout(Integer.parseInt(t));
        }
        return client;
    }

    @Override
    protected void customizeExchange(HttpExchange exchange, HttpServletRequest request) {
        super.customizeExchange(exchange, request);
        exchange.setRequestHeader("Host", null);
    }
}
