package com.ccri.stealth.web;

//Jetty 8
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.HttpExchange;
import org.eclipse.jetty.http.HttpURI;
import org.eclipse.jetty.servlets.ProxyServlet;
import org.eclipse.jetty.util.ssl.SslContextFactory;

//Jetty 9 - without SSL
//import org.eclipse.jetty.proxy.ProxyServlet;

import javax.servlet.http.HttpServletRequest;
import java.net.MalformedURLException;
import java.net.URI;

public class CorsProxyServlet extends ProxyServlet {
    //Jetty 8
    @Override
    protected HttpURI proxyHttpURI(HttpServletRequest request, String uri) throws MalformedURLException {
        String query = request.getQueryString();
        return new HttpURI(URI.create((
                request.getPathInfo() +
                        ((query != null && !query.isEmpty()) ? ("?" + query) : "")
        ).substring(1)));
    }

    @Override
    protected HttpClient createHttpClientInstance() {
        return new HttpClient(new SslContextFactory());
    }

    @Override
    protected void customizeExchange(HttpExchange exchange, HttpServletRequest request) {
        super.customizeExchange(exchange, request);
        exchange.setRequestHeader("Host", null);
    }

    //Jetty 9 - without SSL
    /*@Override
    protected URI rewriteURI(HttpServletRequest request) {
        String query = request.getQueryString();
        return URI.create((
            request.getPathInfo() +
            ((query != null && !query.isEmpty()) ? ("?" + query) : "")
        ).substring(1));
    }*/
}
