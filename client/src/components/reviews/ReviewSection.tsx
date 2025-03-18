import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewSectionProps {
  canReview: boolean;
  offerId?: number;
  requestId?: number;
  onSubmitReview: (data: ReviewFormValues) => void;
  reviews: any[];
}

export function ReviewSection({
  canReview,
  offerId,
  requestId,
  onSubmitReview,
  reviews,
}: ReviewSectionProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const onSubmit = (data: ReviewFormValues) => {
    onSubmitReview(data);
    reviewForm.reset();
    setRating(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Reviews and Ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canReview && (
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(onSubmit)} className="space-y-4 mb-8">
              <FormField
                control={reviewForm.control}
                name="rating"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={`h-6 w-6 cursor-pointer ${
                              (hoveredRating || rating) >= value
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                            onMouseEnter={() => setHoveredRating(value)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => {
                              setRating(value);
                              reviewForm.setValue("rating", value);
                            }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Write your review here..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Submit Review
              </Button>
            </form>
          </Form>
        )}

        <div className="space-y-4">
          {reviews.map((review, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}