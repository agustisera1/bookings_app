export type Review = {
  id: string;
  rating: number;
  comment: string;
  listing_id: string;
  author_name: string;
  host_reply: string | null;
  created_at: string;
};
