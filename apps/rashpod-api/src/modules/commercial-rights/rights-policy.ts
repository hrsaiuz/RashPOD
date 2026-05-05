export function canCreateFilmListing(input: {
  designApproved: boolean;
  allowFilmSales: boolean;
}): boolean {
  // Film sale requires explicit consent regardless of design moderation status.
  return input.designApproved && input.allowFilmSales;
}
