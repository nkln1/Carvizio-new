import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Star, Flag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { insertReviewSchema, type Review } from "@shared/schema";
import type { z } from "zod";

interface ReviewSectionProps {
  serviceProviderId: number;
  reviews: Review[];
  canReview: boolean;
  requestId?: number;
  offerId?: number;
  offerCompletedAt?: Date;
}

type ReviewFormValues = z.infer<typeof insertReviewSchema>;
type ReportFormValues = {
  reason: string;
};

export function ReviewSection({
  serviceProviderId,
  reviews,
  canReview,
  requestId,
  offerId,
  offerCompletedAt
}: ReviewSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      serviceProviderId,
      rating: 5,
      comment: "",
      requestId,
      offerId,
      offerCompletedAt,
      clientId: user?.id
    }
  });

  const reportForm = useForm<ReportFormValues>({
    defaultValues: {
      reason: ""
    }
  });

  const submitReview = useMutation({
    mutationFn: async (values: ReviewFormValues) => {
      const response = await apiRequest("POST", "/api/reviews", values);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit review");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-profile'] });
      toast({
        title: "Recenzie trimisă",
        description: "Vă mulțumim pentru feedback!"
      });
      reviewForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "Nu am putut trimite recenzia. Vă rugăm să încercați din nou."
      });
    }
  });

  const reportReview = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/reviews/${reviewId}/report`, { reason });
      if (!response.ok) {
        throw new Error("Failed to report review");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsReportDialogOpen(false);
      toast({
        title: "Recenzie raportată",
        description: "Vă mulțumim pentru raportare. O vom investiga."
      });
      reportForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu am putut raporta recenzia. Vă rugăm să încercați din nou."
      });
    }
  });

  function onSubmit(values: ReviewFormValues) {
    submitReview.mutate(values);
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Recenzii</h2>

      {canReview && requestId && offerId && offerCompletedAt && (
        <Form {...reviewForm}>
          <form onSubmit={reviewForm.handleSubmit(onSubmit)} className="space-y-4 mb-8">
            <FormField
              control={reviewForm.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        type="button"
                        variant={field.value >= rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(rating)}
                      >
                        <Star className={field.value >= rating ? "fill-current" : ""} />
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={reviewForm.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recenzia ta</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Împărtășește experiența ta cu acest service..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={submitReview.isPending}>
              {submitReview.isPending ? "Se trimite..." : "Trimite recenzia"}
            </Button>
          </form>
        </Form>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {format(new Date(review.createdAt), "dd.MM.yyyy")}
                </p>
              </div>

              <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReviewId(review.id)}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Raportează recenzia</DialogTitle>
                  </DialogHeader>
                  <Form {...reportForm}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (selectedReviewId) {
                          const values = reportForm.getValues();
                          reportReview.mutate({ reviewId: selectedReviewId, reason: values.reason });
                        }
                      }}
                      className="space-y-4"
                    >
                      <FormField
                        control={reportForm.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivul raportării</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Te rugăm să explici motivul pentru care raportezi această recenzie..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={reportReview.isPending}>
                        {reportReview.isPending ? "Se trimite..." : "Trimite raportarea"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <p className="text-gray-500 text-center py-4">Nu există recenzii încă</p>
        )}
      </div>
    </div>
  );
}