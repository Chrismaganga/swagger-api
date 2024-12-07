  // routes/user.js
  import userRoutes from './routes/user';
  app.use('/api', userRoutes);
  import { Router } from 'express';
  const router = Router();

  /**
   * @swagger
   * /user:
   *   get:
   *     summary: Retrieve a list of users
   *     responses:
   *       200:
   *         description: A list of users
   */

  router.get('/user', (req, res) => {
      res.status(200).json([{ name: 'John Doe' }, { name: 'Jane Doe' }]);
  });

  export default router;