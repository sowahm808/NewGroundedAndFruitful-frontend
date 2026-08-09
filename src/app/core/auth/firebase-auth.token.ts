import { InjectionToken } from '@angular/core';
import { Auth } from 'firebase/auth';

/** The single Firebase Auth instance used by authentication and API infrastructure. */
export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase Auth');
