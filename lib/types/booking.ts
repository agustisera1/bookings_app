export type Booking = {
  id: string;
  listing_id: string;
  guest_id: string;
  start_date: string;
  end_date: string;
  status: string;
  status_reason: string | null;
  total_price: string;
  created_at: string;
  guests: number;
};

// View model: zipped data between a booking row and its listing document.
export type GuestBooking = {
  type: string;
  title: string;
  photos: string[];
  created_at: string; // Reservation date
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  id: string;
  guests: number;
};
