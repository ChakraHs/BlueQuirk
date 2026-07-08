// User directory + profile client. Now backed entirely by the native backend
// Identity Domain (admin user API + account endpoints) — no more Identity Service.
// The `Profile` shape is preserved so existing admin/account screens keep working;
// backend `AdminUserView` fields are mapped onto it.
import api from "@/services/api";

export type Profile = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  activated?: boolean;
  createdDate?: string | null;
};

export type ProfileUpdate = {
  email: string;
  firstName: string;
  lastName: string;
};

type AdminUserView = {
  id: number;
  email: string;
  name: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
  createdAt?: string | null;
};

function toProfile(u: AdminUserView): Profile {
  return {
    id: String(u.id),
    username: u.email,
    email: u.email,
    firstName: u.name ?? "",
    lastName: "",
    imageUrl: null,
    activated: u.enabled,
    createdDate: u.createdAt ?? null,
  };
}

export const IdentityService = {
  /** GET /api/users — the customer/user directory (admin-only on the backend). */
  getAllUsers: async (): Promise<Profile[]> => {
    const res = await api.get<AdminUserView[]>(`/users`);
    return Array.isArray(res.data) ? res.data.map(toProfile) : [];
  },

  /** GET /api/users/{id} — full user record. */
  getProfile: async (id: string): Promise<Profile> => {
    const { data } = await api.get<AdminUserView>(`/users/${id}`);
    return toProfile(data);
  },

  /** DELETE /api/users/{id} — remove the account. */
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  /** PATCH /api/users/{id} — update the display name. */
  updateProfile: async (id: string, body: ProfileUpdate): Promise<Profile> => {
    const name = `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim();
    const { data } = await api.patch<AdminUserView>(`/users/${id}`, { name });
    return toProfile(data);
  },

  /** POST /api/account/change-password — change the signed-in user's password. */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post(`/account/change-password`, { currentPassword, newPassword });
  },
};

export default IdentityService;
