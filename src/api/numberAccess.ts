export type WhatsappNumber = {
  phoneNumberId: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
};
export type MemberNumbers = {
  enabled: boolean;
  canManage: boolean;
  activePhoneNumberId: string | null;
  accounts: WhatsappNumber[];
};
export type NumberAccessPolicy = {
  enabled: boolean;
  revision: number;
  assignments: Array<{ phoneNumberId: string; userIds: string[] }>;
  accounts: WhatsappNumber[];
  members: Array<{ id: string; fullName: string; email: string; role: string }>;
};

export function numberAccessPayload(policy: NumberAccessPolicy) {
  return {
    enabled: true,
    revision: policy.revision,
    assignments: policy.assignments
      .filter((assignment) =>
        policy.accounts.some(
          (account) => account.phoneNumberId === assignment.phoneNumberId,
        ),
      )
      .map((assignment) => ({
        phoneNumberId: assignment.phoneNumberId,
        userIds: [...new Set(assignment.userIds)],
      })),
  };
}
