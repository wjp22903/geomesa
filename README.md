# Stealth
### Getting started
1st build:
```sh
mvn clean prepare-package -Pinstall-nodejs,unpack-npm,unpack-bower
```
---
Regular development build:
```sh
mvn clean prepare-package
mvn -pl webapp jetty:run
```
Find your server at http://localhost:8080/stealth  
Then in a 2nd terminal, watch for code changes:
```sh
cd webapp/src/main/ui
./node grunt watch
```
---
After someone commits...  
a **NodeJS** version change: `mvn clean prepare-package -Pinstall-nodejs`  
an **npm** dependency change: `mvn clean prepare-package -Punpack-npm`  
a **bower** dependency change: `mvn clean prepare-package -Punpack-bower`

After **YOU** make...  
an **npm** dependency change: `mvn clean prepare-package -Ppack-npm`  
a **bower** dependency change: `mvn clean prepare-package -Ppack-bower`
