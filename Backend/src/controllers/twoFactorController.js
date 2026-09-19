import twoFactorService from '../services/twoFactorService.js';
import authService from '../services/authService.js';
import auditLogService from '../services/auditLogService.js';

// Same conventions as authController.js: no try/catch, Express 5 forwards
// a thrown/rejected error from an async handler to the centralized
// errorHandler on its own. Both routes run behind
// middleware/auth.js's authenticateForTwoFactorSetup, which accepts EITHER
// a real access token (a logged-in user turning 2FA on voluntarily from
// settings) or a mandatory-enrollment setup token (issued by
// authService.login() when the account isn't enrolled yet) — req.authTokenType
// tells the two cases apart below.
class TwoFactorController {
  setupTotp = async (req, res) => {
    const result = await twoFactorService.setupTotp(req.user.id, req.user.username);
    return res.json({ success: true, data: result });
  };

  verifySetupCode = async (req, res) => {
    const { recoveryCodes } = await twoFactorService.verifySetupCode(req.user.id, req.body.code);

    auditLogService.logFromRequest(req, {
      action: 'auth.2fa.totp.enabled',
      entityType: 'user',
      entityId: req.user.id,
    });

    // Mandatory first-time enrollment (see authService.login) — the user
    // only had a restricted setup token until now, so this is the moment
    // their login actually completes: issue the real tokens a normal login
    // would have, same as verifyTwoFactorChallenge does for an
    // already-enrolled user.
    if (req.authTokenType === '2fa_setup') {
      const { user, tokens } = await authService.completeLogin(req.user.id);
      return res.json({ success: true, data: { user, tokens, recoveryCodes } });
    }

    return res.json({ success: true, data: { recoveryCodes } });
  };
}

export default new TwoFactorController();
