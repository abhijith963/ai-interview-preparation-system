export const toPublicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName ?? '',
  selectedRoleId: user.selectedRoleId ?? null,
  consent: {
    version: user.consent.version,
    acceptedAt: user.consent.acceptedAt,
  },
  createdAt: user.createdAt,
});
