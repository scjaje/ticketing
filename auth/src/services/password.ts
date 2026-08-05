import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class Password {
  // static methods let us call them without creating an instance of the class.
  // allows us to do Password.toHash()
  // without needing to do const example = new Password()
  static async toHash(password: string) {
    const salt = randomBytes(8).toString('hex');
    const buffer = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${buffer.toString('hex')}.${salt}`;
  }

  static async compare(storedPassword: string, suppliedPassword: string) {
    const [hashedPassword, salt] = storedPassword.split('.');

    const buffer = (await scryptAsync(
      suppliedPassword,
      salt as 'hex',
      64,
    )) as Buffer;

    return buffer.toString('hex') === hashedPassword;
  }
}
