import { CHITFUND_ENABLED } from '../config/buildFlags';

export type OptionalAuth = {
  userProfile: {
    name?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    role?: string;
  } | null;
  signOut: () => Promise<void>;
  /** False in the lite build — there is no account, so no sign-out affordance. */
  isAvailable: boolean;
};

/**
 * Auth is a chit-fund concern: the lite build is local-only and has no
 * accounts, no server, and nothing to sign out of. Shared screens use this
 * instead of importing useAuth directly, so they stay outside the module
 * boundary and the lite bundle never resolves Firebase.
 *
 * The require is guarded by a build-time constant, so Metro eliminates the
 * branch and the hook identity is stable across renders.
 */
const chitFundAuth = process.env.CK_CHITFUND === '1'
  ? require('../modules/chitfund/hooks/useAuth').useAuth
  : null;

export const useOptionalAuth = (): OptionalAuth => {
  if (chitFundAuth) {
    const { userProfile, signOut } = chitFundAuth();
    return { userProfile, signOut, isAvailable: true };
  }
  return {
    userProfile: null,
    signOut: async () => {},
    isAvailable: false,
  };
};
