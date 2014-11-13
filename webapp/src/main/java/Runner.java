import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.nio.SelectChannelConnector;
import org.eclipse.jetty.server.ssl.SslSelectChannelConnector;
import org.eclipse.jetty.webapp.WebAppContext;

import java.net.URL;
import java.security.ProtectionDomain;

public class Runner {
    public static final int DEFAULT_PORT = 8080;
    private final Config conf = ConfigFactory.load().getConfig("stealth");
    private Integer port;
    private Integer sslPort;

    public Runner(final Integer port, final Integer sslPort) {
        this.port = port;
        this.sslPort = sslPort;
    }

    public void start() {
        try {
            final Server server = new Server();

            if (sslPort != null) {
                final SslSelectChannelConnector connector = new SslSelectChannelConnector();
                connector.setPort(sslPort);
                connector.setMaxIdleTime(60000);
                connector.setKeystore(conf.getString("private.security.keystore.path"));
                connector.setKeystoreType(conf.getString("private.security.keystore.type"));
                connector.setPassword(conf.getString("private.security.keystore.password"));
                connector.setKeyPassword(conf.getString("private.security.keystore.keyPassword"));
                connector.setTruststore(conf.getString("private.security.truststore.path"));
                connector.setTrustPassword(conf.getString("private.security.truststore.password"));
                connector.setWantClientAuth(false);
                connector.setNeedClientAuth(true);
                server.addConnector(connector);
            } else {
                if (port == null) {
                    port = DEFAULT_PORT;
                }
            }
            if (port != null) {
                final SelectChannelConnector connector = new SelectChannelConnector();
                connector.setPort(port);
                connector.setMaxIdleTime(60000);
                server.addConnector(connector);
            }

            final ProtectionDomain domain = Runner.class.getProtectionDomain();
            final URL location = domain.getCodeSource().getLocation();
            final WebAppContext webapp = new WebAppContext();
            webapp.setContextPath(conf.getString("app.contextPath"));
            webapp.setWar(location.toExternalForm());
            server.setHandler(webapp);

            server.start();
            server.join();
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(-1);
        }
    }

    private static Integer getPort(final String[] args) {
        if (args.length >= 1) {
            try {
                return Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.out.println("Error parsing port number as an integer: " + args[0]);
            }
        }
        return null;
    }

    private static Integer getSslPort(final String[] args) {
        if (args.length >= 2) {
            try {
                return Integer.parseInt(args[1]);
            } catch (NumberFormatException e) {
                System.out.println("Error parsing ssl port number as an integer: "+ args[1]);
            }
        }
        return null;
    }

    public static void main(final String[] args) {
        Integer port = getPort(args);
        Integer sslPort = getSslPort(args);
        if (port == null && sslPort == null) port = DEFAULT_PORT;
        System.out.println("Starting embedded server on ports [" + port + ", " + sslPort + "]");
        final Runner runner = new Runner(port, sslPort);
        runner.start();
    }
}
