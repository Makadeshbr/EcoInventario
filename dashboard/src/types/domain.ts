export type AssetStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'tech' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}
