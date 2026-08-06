import { GraphQLResolveInfo } from 'graphql';
import { ApolloContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Booking = {
  __typename?: 'Booking';
  cancelled_at?: Maybe<Scalars['String']['output']>;
  cancelled_by?: Maybe<BookingParty>;
  created_at?: Maybe<Scalars['String']['output']>;
  end_date?: Maybe<Scalars['String']['output']>;
  guests?: Maybe<Scalars['Int']['output']>;
  host?: Maybe<UserSummary>;
  id: Scalars['ID']['output'];
  listing?: Maybe<Listing>;
  party?: Maybe<BookingParty>;
  refund_amount?: Maybe<Scalars['Float']['output']>;
  start_date?: Maybe<Scalars['String']['output']>;
  status?: Maybe<BookingStatus>;
  status_reason?: Maybe<Scalars['String']['output']>;
  total_price?: Maybe<Scalars['Float']['output']>;
};

export type BookingParty =
  | 'guest'
  | 'host';

export type BookingStatus =
  | 'accepted'
  | 'cancelled'
  | 'pending'
  | 'rejected';

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
  _id: Scalars['String']['output'];
  attributes?: Maybe<ListingAttributes>;
  availabilityRange?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  description: Scalars['String']['output'];
  host_id: Scalars['String']['output'];
  location?: Maybe<Location>;
  photos?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  price: Scalars['Int']['output'];
  rating?: Maybe<Scalars['Float']['output']>;
  rating_avg?: Maybe<Scalars['Float']['output']>;
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

export type Query = {
  __typename?: 'Query';
  booking?: Maybe<Booking>;
  guestBookings?: Maybe<Array<Maybe<Booking>>>;
  listing?: Maybe<Listing>;
  listings?: Maybe<Array<Listing>>;
};


export type QueryBookingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryListingArgs = {
  listing_id: Scalars['String']['input'];
};


export type QueryListingsArgs = {
  filters?: InputMaybe<FiltersInput>;
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
  Booking: ResolverTypeWrapper<Booking>;
  BookingParty: BookingParty;
  BookingStatus: BookingStatus;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  FiltersInput: FiltersInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Listing: ResolverTypeWrapper<Listing>;
  ListingAttributes: ResolverTypeWrapper<ListingAttributes>;
  Location: ResolverTypeWrapper<Location>;
  LocationInput: LocationInput;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UserSummary: ResolverTypeWrapper<UserSummary>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Booking: Booking;
  Boolean: Scalars['Boolean']['output'];
  FiltersInput: FiltersInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Listing: Listing;
  ListingAttributes: ListingAttributes;
  Location: Location;
  LocationInput: LocationInput;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  UserSummary: UserSummary;
}>;

export type BookingResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Booking'] = ResolversParentTypes['Booking']> = ResolversObject<{
  cancelled_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cancelled_by?: Resolver<Maybe<ResolversTypes['BookingParty']>, ParentType, ContextType>;
  created_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  end_date?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  guests?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  host?: Resolver<Maybe<ResolversTypes['UserSummary']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  listing?: Resolver<Maybe<ResolversTypes['Listing']>, ParentType, ContextType>;
  party?: Resolver<Maybe<ResolversTypes['BookingParty']>, ParentType, ContextType>;
  refund_amount?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  start_date?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['BookingStatus']>, ParentType, ContextType>;
  status_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  total_price?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
}>;

export type ListingResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Listing'] = ResolversParentTypes['Listing']> = ResolversObject<{
  _id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  attributes?: Resolver<Maybe<ResolversTypes['ListingAttributes']>, ParentType, ContextType>;
  availabilityRange?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  host_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['Location']>, ParentType, ContextType>;
  photos?: Resolver<Maybe<Array<Maybe<ResolversTypes['String']>>>, ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rating?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rating_avg?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
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

export type QueryResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  booking?: Resolver<Maybe<ResolversTypes['Booking']>, ParentType, ContextType, RequireFields<QueryBookingArgs, 'id'>>;
  guestBookings?: Resolver<Maybe<Array<Maybe<ResolversTypes['Booking']>>>, ParentType, ContextType>;
  listing?: Resolver<Maybe<ResolversTypes['Listing']>, ParentType, ContextType, RequireFields<QueryListingArgs, 'listing_id'>>;
  listings?: Resolver<Maybe<Array<ResolversTypes['Listing']>>, ParentType, ContextType, Partial<QueryListingsArgs>>;
}>;

export type UserSummaryResolvers<ContextType = ApolloContext, ParentType extends ResolversParentTypes['UserSummary'] = ResolversParentTypes['UserSummary']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ApolloContext> = ResolversObject<{
  Booking?: BookingResolvers<ContextType>;
  Listing?: ListingResolvers<ContextType>;
  ListingAttributes?: ListingAttributesResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  UserSummary?: UserSummaryResolvers<ContextType>;
}>;

