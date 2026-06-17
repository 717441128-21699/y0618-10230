import { Request, Response } from 'express';
import { FileStorageService } from '../services/FileStorageService.js';
import { LoginRequest, LoginResponse } from '../../shared/types/index.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password, role }: LoginRequest = req.body;
      const users = FileStorageService.readUsers();
      
      const user = users.find(u => u.email === email && u.password === password && u.role === role);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '邮箱、密码或角色错误'
        } as LoginResponse);
      }

      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({
        success: true,
        user: userWithoutPassword,
        token: `token_${Date.now()}_${user.id}`
      } as LoginResponse);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: '服务器错误'
      } as LoginResponse);
    }
  }
}
