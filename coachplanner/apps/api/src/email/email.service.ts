import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationEmail(email: string, token: string) {
    const confirmLink = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;

    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Verifica tu cuenta en CoachPlanner',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Bienvenido a CoachPlanner! 🏋️‍♂️</h2>
            <p>Gracias por registrarte. Para comenzar a usar tu cuenta, por favor verifica tu correo electrónico.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verificar mi Correo
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error enviando email:', error);
    }
  }

  async sendClassCancellation(email: string, className: string, date: string) {
    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: '⚠️ IMPORTANTE: Clase Cancelada',
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #d32f2f;">Aviso de Cancelación</h2>
            <p>Hola,</p>
            <p>Lamentamos informarte que la clase <strong>${className}</strong> programada para el <strong>${date}</strong> ha sido cancelada.</p>
            <p><strong>Tus créditos han sido reintegrados automáticamente a tu cuenta.</strong></p>
            <p>Disculpa las molestias.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error enviando aviso de cancelación:', error);
    }
  }

  async sendBalanceAdded(email: string, amount: number, newTotal: number) {
    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: '✅ Saldo Acreditado',
        html: `
          <div style="font-family: sans-serif;">
            <h2>¡Pago Recibido!</h2>
            <p>Se han acreditado exitosamente <strong>${amount} créditos</strong> a tu cuenta.</p>
            <p style="font-size: 18px;">Tu saldo total ahora es: <strong>${newTotal} créditos</strong>.</p>
            <p>¡A entrenar! 💪</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error enviando confirmación de saldo:', error);
    }
  }

  async sendNewStudentAlert(ownerEmail: string, studentName: string, gymName: string) {
    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: ownerEmail,
        subject: '🚀 Nuevo Alumno en ' + gymName,
        html: `
          <div style="font-family: sans-serif;">
            <h2>¡Tu comunidad crece!</h2>
            <p>El alumno <strong>${studentName}</strong> se acaba de registrar en <strong>${gymName}</strong>.</p>
            <p>Ingresa a tu panel para ver más detalles y asignarle una categoría si es necesario.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error enviando alerta de nuevo alumno:', error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: '🔐 Recupera tu contraseña',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¿Olvidaste tu contraseña?</h2>
            <p>No te preocupes, es algo que nos pasa a todos. Haz clic en el siguiente botón para crear una nueva:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">Este enlace expirará en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error enviando email de recuperación:', error);
    }
  }

  async sendStaffInvitation(email: string, gymName: string, role: string, token: string) {
    const inviteLink = `${process.env.FRONTEND_URL}/join-team?token=${token}`;
    const roleName = role === 'INSTRUCTOR' ? 'Profesor' : 'Staff / Administrador';

    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: `Invitación para unirte a ${gymName} en CoachPlanner`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Hola! 👋</h2>
            <p>Has sido invitado a unirte al equipo de <strong>${gymName}</strong> con el rol de <strong>${roleName}</strong>.</p>
            <p>Para aceptar la invitación y configurar tu cuenta, haz clic en el siguiente botón:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Aceptar Invitación
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Si ya tienes una cuenta en CoachPlanner, solo tendrás que iniciar sesión. Si no, podrás crear una en segundos.</p>
            <p style="color: #999; font-size: 12px;">Este enlace expirará en 7 días. Si no esperabas este correo, puedes ignorarlo con seguridad.</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error enviando email de invitación:', error);
    }
  }
}