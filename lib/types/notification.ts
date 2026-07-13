export type NotificationDocument = {
  _id: string;

  listing_id: string; // The listing linked from listingsDb.listings
  host_id: string;
  guest_id: string; // The user that recieves the notification
  booking_id: string;
  target_id: string; // The logged in user that should grab this notification

  body: string;
  title: string;

  is_read: boolean;
};
