import { createTransport } from '../config/nodemailer.js';

export async function sendEmailVerification({ name, email, token }) {
    const transporter = createTransport(
        process.env.EMAIL_HOST,
        process.env.EMAIL_PORT,
        process.env.EMAIL_USER,
        process.env.EMAIL_PASS
    );

    // Plantilla HTML bonita para Vivantia
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vivantia - Confirme su cuenta</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background-color: #f4f7f9;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .header .icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .content h2 {
                color: #2E7D32;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content p {
                color: #666;
                font-size: 16px;
                margin-bottom: 25px;
                line-height: 1.8;
            }
            .btn-container {
                margin: 35px 0;
            }
            .verify-btn {
                display: inline-block;
                padding: 15px 40px;
                background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
                color: white;
                text-decoration: none;
                border-radius: 50px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            }
            .verify-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
            }
            .features {
                background-color: #f8fffe;
                padding: 30px;
                margin: 20px 0;
                border-radius: 8px;
                border-left: 4px solid #4CAF50;
            }
            .features h3 {
                color: #2E7D32;
                margin-bottom: 15px;
            }
            .features ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .features li {
                padding: 8px 0;
                color: #666;
            }
            .features li:before {
                content: "🌱 ";
                margin-right: 8px;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 25px;
                text-align: center;
                color: #888;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            .footer a {
                color: #4CAF50;
                text-decoration: none;
            }
            .security-note {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="icon">🌿</div>
                <h1>Vivantia</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Riego Inteligente</p>
            </div>
            
            <div class="content">
                <h2>¡Bienvenido/a, ${name}!</h2>
                <p>
                    Gracias por unirte a <strong>Vivantia</strong>, la plataforma IoT de gestión de riego inteligente 
                    que te ayudará a cuidar tus cultivos de manera eficiente y sostenible.
                </p>
                
                <div class="features">
                    <h3>Con Vivantia podrás:</h3>
                    <ul>
                        <li>Monitorear la humedad y temperatura ambiental y humedad del suelo de tus cultivos en tiempo real</li>
                        <li>Programar y automatizar el riego de sus cultivos</li>
                        <li>Recibir alertas y notificaciones sobre el uso de agua y el estado de tus cultivos</li>
                        <li>Optimizar el uso del agua y mejorar sus cosechas</li>
                    </ul>
                </div>
                
                <p>
                    Para comenzar a utilizar el sistema de gestión de riego inteligente, 
                    necesita confirmar su cuenta haciendo clic en el botón de abajo:
                </p>
                
                <div class="btn-container">
                    <a href="${process.env.FRONTEND_URL}/auth/confirm/${token}" class="verify-btn">
                        ✅ Confirmar mi cuenta
                    </a>
                </div>
                
                <div class="security-note">
                    <strong>⚠️ Nota de seguridad:</strong> Si no creaste esta cuenta, puedes ignorar este mensaje. 
                    Tu información estará protegida.
                </div>
            </div>
            
            <div class="footer">
                <p>
                    <strong>Vivantia</strong> - Tecnología sostenible para el futuro de la agricultura
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Enviar el email
    const info = await transporter.sendMail({
        from: 'Vivantia <cuentas@vivantia.com>',
        to: email,
        subject: "🌿 Vivantia - Confirma tu cuenta",
        text: `Hola ${name}, confirma tu cuenta en Vivantia. Tu cuenta está casi lista, solo debes confirmarla en el siguiente enlace: ${process.env.FRONTEND_URL}/auth/confirm/${token}`,
        html: htmlTemplate
    });

    console.log('✅ Email de verificación enviado:', info.messageId);
}

export async function sendEmailPasswordReset({ name, email, token }) {
    const transporter = createTransport(
        process.env.EMAIL_HOST,
        process.env.EMAIL_PORT,
        process.env.EMAIL_USER,
        process.env.EMAIL_PASS
    );

    // Plantilla HTML para reset de contraseña
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vivantia - Reestablecer contraseña</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background-color: #f4f7f9;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #FF7043 0%, #FF5722 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .header .icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .content h2 {
                color: #FF5722;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content p {
                color: #666;
                font-size: 16px;
                margin-bottom: 25px;
                line-height: 1.8;
            }
            .btn-container {
                margin: 35px 0;
            }
            .reset-btn {
                display: inline-block;
                padding: 15px 40px;
                background: linear-gradient(135deg, #FF5722 0%, #FF7043 100%);
                color: white;
                text-decoration: none;
                border-radius: 50px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(255, 87, 34, 0.3);
            }
            .reset-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255, 87, 34, 0.4);
            }
            .security-info {
                background-color: #fff3e0;
                border: 1px solid #ffcc02;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
                text-align: left;
            }
            .security-info h3 {
                color: #FF5722;
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
            }
            .security-info ul {
                margin: 0;
                padding-left: 20px;
                color: #666;
            }
            .security-info li {
                margin-bottom: 8px;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 25px;
                text-align: center;
                color: #888;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            .footer a {
                color: #FF5722;
                text-decoration: none;
            }
            .warning-note {
                background-color: #ffebee;
                border-left: 4px solid #f44336;
                padding: 15px;
                margin: 20px 0;
                color: #c62828;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="icon">🔐</div>
                <h1>Vivantia</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Riego Inteligente</p>
            </div>
            
            <div class="content">
                <h2>Reestablecer contraseña</h2>
                <p>
                    Hola <strong>${name}</strong>,
                </p>
                <p>
                    Hemos recibido una solicitud para reestablecer la contraseña de su cuenta en Vivantia. 
                    Si fue usted quien la solicitó, puede crear una nueva contraseña haciendo clic en el botón de abajo.
                </p>
                
                <div class="btn-container">
                    <a href="${process.env.FRONTEND_URL}/auth/new-password/${token}" class="reset-btn">
                        🔑 Reestablecer mi contraseña
                    </a>
                </div>
                
                <div class="security-info">
                    <h3>🛡️ Consejos de seguridad:</h3>
                    <ul>
                        <li>Este enlace expirará en 24 horas por seguridad</li>
                        <li>Nunca compartas tu contraseña con nadie</li>
                        <li>Usa una contraseña fuerte con al menos 8 caracteres</li>
                        <li>Combina letras, números y símbolos especiales</li>
                    </ul>
                </div>
                
                <div class="warning-note">
                    <strong>⚠️ ¿No solicitaste este cambio?</strong><br>
                    Si no fue usted quien solicitó reestablecer la contraseña, puedes ignorar este email. 
                    Su cuenta permanece segura y no se realizarán cambios.
                </div>
            </div>
            
            <div class="footer">
                <p>
                    <strong>Vivantia</strong> - Tecnología sostenible para el futuro de la agricultura
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Enviar el email
    const info = await transporter.sendMail({
        from: 'Vivantia <cuentas@vivantia.com>',
        to: email,
        subject: "🔐 Vivantia - Reestablecer contraseña",
        text: `Hola ${name}, has solicitado reestablecer tu contraseña en Vivantia. Sigue el siguiente enlace para generar una nueva contraseña: ${process.env.FRONTEND_URL}/auth/new-password/${token}`,
        html: htmlTemplate
    });

    console.log('✅ Email de reset de contraseña enviado:', info.messageId);
}
