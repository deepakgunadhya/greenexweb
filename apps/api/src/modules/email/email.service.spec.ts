import { EmailService } from './email.service';

describe('EmailService', () => {
  it('should be instantiable', () => {
    const svc = new EmailService();
    expect(svc).toBeDefined();
  });
});