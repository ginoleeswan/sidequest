/**
 * Stand-in for binary assets jest has no transformer for (woff2 web
 * fonts). The app only ever passes these to expo-asset / font
 * registration, so an opaque number — the same shape Metro's asset
 * system returns — is faithful.
 */
module.exports = 1;
