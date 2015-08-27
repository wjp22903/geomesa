<html style="background-color:#003270;">
    <head>
        <style>
            .letter {
                background: #fff;
                box-shadow: 0 0 10px rgba(0,0,0,0.3);
                margin: 26px auto 0;
                max-width: 550px;
                min-height: 300px;
                padding: 24px;
                position: relative;
                width: 80%;
            }
            .letter:before, .letter:after {
                content: "";
                height: 98%;
                position: absolute;
                width: 100%;
                z-index: -1;
            }
            .letter:before {
                background: #fafafa;
                box-shadow: 0 0 8px rgba(0,0,0,0.2);
                left: -5px;
                top: 4px;
                transform: rotate(-2.5deg);
            }
            .letter:after {
                background: #f6f6f6;
                box-shadow: 0 0 3px rgba(0,0,0,0.2);
                right: -3px;
                top: 1px;
                transform: rotate(1.4deg);
            }
        </style>
    </head>
    <body>
        <div class="letter" style="text-align:center;">
            <h2>***** Notice *****</h2>
            <hr>
            <p><strong>This is an example of a splash page.</strong></p>
            <p>This will appear to users everytime they access this site.</p>
        </div>
    </body>
</html>
