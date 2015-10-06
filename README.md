# Stealth

### Getting started
1st build: `mvn clean prepare-package -Pinstall-nodejs,unpack-npm,unpack-bower`

After someone commits a nodejs version change: `mvn clean prepare-package -Pinstall-nodejs`  
After someone commits an npm dependency change: `mvn clean prepare-package -Punpack-npm`  
After someone commits a bower dependency change: `mvn clean prepare-package -Punpack-bower`

After **you** make an npm dependency change (with internet): `mvn clean prepare-package -Ppack-npm`  
After **you** make a bower dependency change (with internet): `mvn clean prepare-package -Ppack-bower`

Regular development build: `mvn clean prepare-package`  
Then run webapp in jetty: `mvn -pl webapp jetty:run`  
Then in a 2nd terminal, watch for code changes: `./node grunt watch` from src/main/ui directory  
