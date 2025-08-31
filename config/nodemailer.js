import nodemailer from 'nodemailer';

export function createTransport(host, port, user, pass) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}