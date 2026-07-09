/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: refreshToken
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_code:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, manager, employee]
 *         departmentId:
 *           type: integer
 *         employment_type:
 *           type: string
 *           enum: [full_time, part_time]
 *         employment_status:
 *           type: string
 *           enum: [active, inactive, retired]
 *     AttendanceRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         date:
 *           type: string
 *           format: date
 *         check_in:
 *           type: string
 *           format: date-time
 *         check_out:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [present, absent, late, early_leave, holiday]
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Get new access token using refresh token cookie
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     description: Revoke refresh token and clear cookies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/attendance/checkin:
 *   post:
 *     tags: [Attendance]
 *     summary: Check in
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in recorded
 *       400:
 *         description: Already checked in today
 */

/**
 * @swagger
 * /api/attendance/checkout:
 *   post:
 *     tags: [Attendance]
 *     summary: Check out
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-out recorded
 *       400:
 *         description: Not checked in
 */

/**
 * @swagger
 * /api/attendance/timesheet:
 *   get:
 *     tags: [Attendance]
 *     summary: Get timesheet for a month
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2026-07"
 *     responses:
 *       200:
 *         description: Monthly timesheet data
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: List all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         description: Admin/manager only
 *   post:
 *     tags: [Admin - Users]
 *     summary: Create new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: "Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
 *               role:
 *                 type: string
 *                 enum: [admin, manager, employee]
 *               departmentId:
 *                 type: integer
 *               employmentType:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error (weak password, missing fields)
 *       409:
 *         description: Email already exists
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     tags: [Admin - Users]
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     tags: [Admin - Users]
 *     summary: Delete user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted
 */

/**
 * @swagger
 * /api/notices:
 *   get:
 *     tags: [Notices]
 *     summary: Get notifications for current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of notifications
 */

/**
 * @swagger
 * /api/leave/balance:
 *   get:
 *     tags: [Leave]
 *     summary: Get leave balance for user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave balance data
 */

/**
 * @swagger
 * /api/faq:
 *   get:
 *     tags: [FAQ]
 *     summary: Get FAQ items
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of FAQ items
 */

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     tags: [Users]
 *     summary: Change own password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 description: "Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
