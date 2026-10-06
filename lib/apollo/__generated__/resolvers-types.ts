import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { BookingNode as BookingNodeModel } from '@/lib/bookings/types';
import { Listing as ListingModel } from '@/lib/listings/types';
import { NotificationDocument as NotificationDocumentModel } from '@/lib/notifications/types';
import { SerializableChatDocument as SerializableChatDocumentModel, SerializableMessageDocument as SerializableMessageDocumentModel } from '@/lib/chat/types';
import { ApolloContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date; output: Date | string; }
};

export type BookedRange = {
  __typename?: 'BookedRange';
  end_date: Scalars['DateTime']['output'];
  start_date: Scalars['DateTime']['output'];
};

export type Booking = {
  __typename?: 'Booking';
  cancelled_at?: Maybe<Scalars['DateTime']['output']>;
  cancelled_by?: Maybe<BookingParty>;
  created_at: Scalars['DateTime']['output'];
  end_date: Scalars['DateTime']['output'];
  guests: Scalars['Int']['output'];
  host?: Maybe<UserSummary>;
  id: Scalars['ID']['output'];
  listing?: Maybe<Listing>;
  party: BookingParty;
  refund_amount: Scalars['Float']['output'];
  start_date: Scalars['DateTime']['output'];
  status: BookingStatus;
  status_reason?: Maybe<Scalars['String']['output']>;
  total_price: Scalars['Float']['output'];
};

export type BookingParty =
  | 'guest'
  | 'host';

export type BookingStatus =
  | 'accepted'
  | 'cancelled'
  | 'pending'
  | 'rejected';

export type ChatMessage = {
  __typename?: 'ChatMessage';
  body: Scalars['String']['output'];
  chat_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  sender_id: Scalars['ID']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type ChatMessagePage = {
  __typename?: 'ChatMessagePage';
  items: Array<ChatMessage>;
  olderCursor?: Maybe<Scalars['DateTime']['output']>;
};

export type ChatMeta = {
  __typename?: 'ChatMeta';
  booking_id: Scalars['ID']['output'];
  guest_id: Scalars['ID']['output'];
  host_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  started_at: Scalars['DateTime']['output'];
};

export type ChatThread = {
  __typename?: 'ChatThread';
  chat?: Maybe<ChatMeta>;
  messages: ChatMessagePage;
  party: BookingParty;
};

export type Conversation = {
  __typename?: 'Conversation';
  end_date: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  party: BookingParty;
  photo?: Maybe<Scalars['String']['output']>;
  start_date: Scalars['DateTime']['output'];
  status: BookingStatus;
  title: Scalars['String']['output'];
};

export type FiltersInput = {
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
  availabilityRange?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  bathrooms?: InputMaybe<Scalars['Int']['input']>;
  beds?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  location?: InputMaybe<LocationInput>;
  maxGuests?: InputMaybe<Scalars['Int']['input']>;
  own?: InputMaybe<Scalars['Boolean']['input']>;
  priceRange?: InputMaybe<Array<Scalars['Float']['input']>>;
  propertyType?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Float']['input']>;
  term?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type Listing = {
  __typename?: 'Listing';
  attributes?: Maybe<ListingAttributes>;
  availability?: Maybe<Array<BookedRange>>;
  bookings?: Maybe<Array<Booking>>;
  description: Scalars['String']['output'];
  host_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  location?: Maybe<Location>;
  photos?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  price: Scalars['Int']['output'];
  rating_avg?: Maybe<Scalars['Float']['output']>;
  reviews?: Maybe<Array<Review>>;
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ListingAttributes = {
  __typename?: 'ListingAttributes';
  amenities?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  bathrooms?: Maybe<Scalars['Int']['output']>;
  beds?: Maybe<Scalars['Int']['output']>;
  check_in_time?: Maybe<Scalars['String']['output']>;
  check_out_time?: Maybe<Scalars['String']['output']>;
  max_guests?: Maybe<Scalars['Int']['output']>;
  minimum_nights?: Maybe<Scalars['Int']['output']>;
  property_type?: Maybe<Scalars['String']['output']>;
};

export type Location = {
  __typename?: 'Location';
  address?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  coordinates?: Maybe<Array<Scalars['Float']['output']>>;
  country?: Maybe<Scalars['String']['output']>;
};

export type LocationInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  coordinates?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  country?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type Notification = {
  __typename?: 'Notification';
  body: Scalars['String']['output'];
  booking_id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  guest_id: Scalars['ID']['output'];
  host_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  is_read: Scalars['Boolean']['output'];
  listing_id: Scalars['ID']['output'];
  target_id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  booking?: Maybe<Booking>;
  chatThread?: Maybe<ChatThread>;
  conversations?: Maybe<Array<Conversation>>;
  guestBookings?: Maybe<Array<Booking>>;
  listing?: Maybe<Listing>;
  listings?: Maybe<Array<Listing>>;
  notifications?: Maybe<Array<Notification>>;
  notificationsCount?: Maybe<Scalars['Int']['output']>;
  unreadMessagesCount?: Maybe<Scalars['Int']['output']>;
};


export type QueryBookingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryChatThreadArgs = {
  from?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
};


export type QueryListingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryListingsArgs = {
  filters?: InputMaybe<FiltersInput>;
};

export type Review = {
  __typename?: 'Review';
  author_name: Scalars['String']['output'];
  comment: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  host_reply?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  listing_id: Scalars['ID']['output'];
  rating: Scalars['Int']['output'];
};

export type UserSummary = {
  __typename?: 'UserSummary';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BookedRange: ResolverTypeWrapper<BookedRange>;
  Booking: ResolverTypeWrapper<BookingNodeModel>;
  BookingParty: BookingParty;
  BookingStatus: BookingStatus;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ChatMessage: ResolverTypeWrapper<SerializableMessageDocumentModel>;
  ChatMessagePage: ResolverTypeWrapper<Omit<ChatMessagePage, 'items'> & { items: Array<ResolversTypes['ChatMessage']> }>;
  ChatMeta: ResolverTypeWrapper<SerializableChatDocumentModel>;
  ChatThread: ResolverTypeWrapper<Omit<ChatThread, 'chat' | 'messages'> & { chat?: Maybe<ResolversTypes['ChatMeta']>, messages: ResolversTypes['ChatMessagePage'] }>;
  Conversation: ResolverTypeWrapper<Conversation>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  FiltersInput: FiltersInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Listing: ResolverTypeWrapper<ListingModel>;
  ListingAttributes: ResolverTypeWrapper<ListingAttributes>;
  Location: ResolverTypeWrapper<Location>;
  LocationInput: LocationInput;
  Notification: ResolverTypeWrapper<NotificationDocumentModel>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Review: ResolverTypeWrapper<Review>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UserSummary: ResolverTypeWrapper<UserSummary>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BookedRange: BookedRange;
  Booking: BookingNodeModel;
  Boolean: Scalars['Boolean']['output'];
  ChatMessage: SerializableMessageDocumentModel;
  ChatMessagePage: Omit<ChatMessagePage, 'items'> & { items: Array<ResolversParentTypes['ChatMessage']> };
  ChatMeta: SerializableChatDocumentModel;
  ChatThread: Omit<ChatThread, 'chat' | 'messages'> & { chat?: Maybe<ResolversParentTypes['ChatMeta']>, messages: ResolversParentTypes['ChatMessagePage'] };
  Conversation: Conversation;
  DateTime: Scalars['DateTime']['output'];
  FiltersInput: FiltersInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Listing: ListingModel;
  ListingAttributes: ListingAttributes;
  Location: Location;
  LocationInput: LocationInput;
  Notification: NotificationDocumentModel;
  Query: Record<PropertyKey, never>;
  Review: Review;
  String: Scalars['String']['output'];
  UserSummary: UserSummary;
}>;

export type BookedRangeResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['BookedRange'] = ResolversParentTypes['BookedRange']> = ResolversObject<{
  end_date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  start_date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type BookingResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Booking'] = ResolversParentTypes['Booking']> = ResolversObject<{
  cancelled_at?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  cancelled_by?: Resolver<Maybe<ResolversTypes['BookingParty']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  end_date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  guests?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  host?: Resolver<Maybe<ResolversTypes['UserSummary']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  listing?: Resolver<Maybe<ResolversTypes['Listing']>, ParentType, ContextType>;
  party?: Resolver<ResolversTypes['BookingParty'], ParentType, ContextType>;
  refund_amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  start_date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BookingStatus'], ParentType, ContextType>;
  status_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  total_price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type ChatMessageResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['ChatMessage'] = ResolversParentTypes['ChatMessage']> = ResolversObject<{
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chat_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sender_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type ChatMessagePageResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['ChatMessagePage'] = ResolversParentTypes['ChatMessagePage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType>;
  olderCursor?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type ChatMetaResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['ChatMeta'] = ResolversParentTypes['ChatMeta']> = ResolversObject<{
  booking_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  guest_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  host_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  started_at?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type ChatThreadResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['ChatThread'] = ResolversParentTypes['ChatThread']> = ResolversObject<{
  chat?: Resolver<Maybe<ResolversTypes['ChatMeta']>, ParentType, ContextType>;
  messages?: Resolver<ResolversTypes['ChatMessagePage'], ParentType, ContextType>;
  party?: Resolver<ResolversTypes['BookingParty'], ParentType, ContextType>;
}>;

export type ConversationResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Conversation'] = ResolversParentTypes['Conversation']> = ResolversObject<{
  end_date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  party?: Resolver<ResolversTypes['BookingParty'], ParentType, ContextType>;
  photo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  start_date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BookingStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type ListingResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Listing'] = ResolversParentTypes['Listing']> = ResolversObject<{
  attributes?: Resolver<Maybe<ResolversTypes['ListingAttributes']>, ParentType, ContextType>;
  availability?: Resolver<Maybe<Array<ResolversTypes['BookedRange']>>, ParentType, ContextType>;
  bookings?: Resolver<Maybe<Array<ResolversTypes['Booking']>>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  host_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['Location']>, ParentType, ContextType>;
  photos?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rating_avg?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  reviews?: Resolver<Maybe<Array<ResolversTypes['Review']>>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ListingAttributesResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['ListingAttributes'] = ResolversParentTypes['ListingAttributes']> = ResolversObject<{
  amenities?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  bathrooms?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  beds?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  check_in_time?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  check_out_time?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  max_guests?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minimum_nights?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  property_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type LocationResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = ResolversObject<{
  address?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  coordinates?: Resolver<Maybe<Array<ResolversTypes['Float']>>, ParentType, ContextType>;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NotificationResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = ResolversObject<{
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  booking_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  guest_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  host_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  is_read?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  listing_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  target_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  booking?: Resolver<Maybe<ResolversTypes['Booking']>, ParentType, ContextType, RequireFields<QueryBookingArgs, 'id'>>;
  chatThread?: Resolver<Maybe<ResolversTypes['ChatThread']>, ParentType, ContextType, RequireFields<QueryChatThreadArgs, 'id'>>;
  conversations?: Resolver<Maybe<Array<ResolversTypes['Conversation']>>, ParentType, ContextType>;
  guestBookings?: Resolver<Maybe<Array<ResolversTypes['Booking']>>, ParentType, ContextType>;
  listing?: Resolver<Maybe<ResolversTypes['Listing']>, ParentType, ContextType, RequireFields<QueryListingArgs, 'id'>>;
  listings?: Resolver<Maybe<Array<ResolversTypes['Listing']>>, ParentType, ContextType, Partial<QueryListingsArgs>>;
  notifications?: Resolver<Maybe<Array<ResolversTypes['Notification']>>, ParentType, ContextType>;
  notificationsCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  unreadMessagesCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
}>;

export type ReviewResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = ResolversObject<{
  author_name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  host_reply?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  listing_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type UserSummaryResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['UserSummary'] = ResolversParentTypes['UserSummary']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ApolloContext> = ResolversObject<{
  BookedRange?: BookedRangeResolvers<ContextType>;
  Booking?: BookingResolvers<ContextType>;
  ChatMessage?: ChatMessageResolvers<ContextType>;
  ChatMessagePage?: ChatMessagePageResolvers<ContextType>;
  ChatMeta?: ChatMetaResolvers<ContextType>;
  ChatThread?: ChatThreadResolvers<ContextType>;
  Conversation?: ConversationResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Listing?: ListingResolvers<ContextType>;
  ListingAttributes?: ListingAttributesResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  UserSummary?: UserSummaryResolvers<ContextType>;
}>;

