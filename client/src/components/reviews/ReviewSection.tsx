import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Star, User, Filter, ArrowUpDown, ChevronDown, Check, ChevronLeft, ChevronRight, Edit2, Save } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const reviewSchema = z.object({
  rating: z.number().min(1, "Selectați o evaluare").max(5),
  comment: z.string().min(20, "Recenzia trebuie să aibă cel puțin 20 de caractere").max(500),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewProps {
  id: number;
  rating: number;
  comment: string;
  clientId: number;
  clientName?: string;
  createdAt: string | Date;
  lastModified?: string | Date;
}

type SortOption = "newest" | "oldest";
type FilterOption = "all" | "5" | "4" | "3" | "2" | "1";
type PerPageOption = 5 | 10 | 20 | 50;

interface ReviewSectionProps {
  canReview: boolean;
  isLoading?: boolean;
  offerId?: number;
  requestId?: number;
  onSubmitReview: (data: ReviewFormValues) => Promise<void>;
  onUpdateReview?: (id: number, data: ReviewFormValues) => Promise<void>;
  reviews: ReviewProps[];
  currentUserId?: number;
}

export function ReviewSection({
  canReview,
  isLoading = false,
  offerId,
  requestId,
  onSubmitReview,
  onUpdateReview,
  reviews,
  currentUserId,
}: ReviewSectionProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // State pentru paginație, filtrare și sortare
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPageOption>(5);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");

  // Form pentru editarea recenziei
  const editForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  // Resetăm formularul de editare când se schimbă ID-ul recenziei editate
  useEffect(() => {
    if (editingReviewId) {
      const reviewToEdit = reviews.find(r => r.id === editingReviewId);
      if (reviewToEdit) {
        editForm.reset({
          rating: reviewToEdit.rating,
          comment: reviewToEdit.comment
        });
        setRating(reviewToEdit.rating);
      }
    }
  }, [editingReviewId, reviews, editForm]);

  // Resetăm pagina curentă când schimbăm filtrele
  useEffect(() => {
    setCurrentPage(1);
  }, [filterOption, perPage]);

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const onSubmit = async (data: ReviewFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmitReview(data);
      reviewForm.reset();
      setRating(0);
      toast({
        title: "Succes",
        description: "Recenzia a fost trimisă cu succes",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut trimite recenzia",
      });
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler pentru actualizarea recenziei
  const onSubmitEdit = async (data: ReviewFormValues) => {
    if (!editingReviewId || !onUpdateReview) return;

    try {
      setIsSubmitting(true);
      await onUpdateReview(editingReviewId, data);
      setEditingReviewId(null);
      editForm.reset();

      toast({
        title: "Succes",
        description: "Recenzia a fost actualizată cu succes",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut actualiza recenzia",
      });
      console.error("Error updating review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatează data într-un format mai prietenos
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrăm recenziile
  const filteredReviews = reviews.filter(review => {
    if (filterOption === "all") return true;
    return review.rating === parseInt(filterOption);
  });

  // Sortăm recenziile
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();

    return sortOption === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Calculăm paginația
  const totalPages = Math.ceil(sortedReviews.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedReviews = sortedReviews.slice(startIndex, startIndex + perPage);

  // Generăm linkurile de paginare
  const generatePaginationLinks = () => {
    const links = [];

    // Nu afișăm paginarea dacă avem doar o pagină
    if (totalPages <= 1) return [];

    // Dacă avem mai puțin de 7 pagini, afișăm toate numerele
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        links.push(i);
      }
      return links;
    }

    // Pentru multe pagini, implementăm o paginare cu ellipsis
    links.push(1);

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      endPage = 5;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 4;
    }

    if (startPage > 2) {
      links.push("ellipsis-start");
    }

    for (let i = startPage; i <= endPage; i++) {
      links.push(i);
    }

    if (endPage < totalPages - 1) {
      links.push("ellipsis-end");
    }

    links.push(totalPages);

    return links;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="mb-4 text-gray-500">
          Opiniile clienților despre acest service auto
        </div>
      </div>
      <div className="px-6 pb-6">
        {canReview && (
          <>
            <Form {...reviewForm}>
              <form onSubmit={reviewForm.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                <div className="mb-2">
                  <p className="text-sm font-medium mb-2">Evaluarea dumneavoastră</p>
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
                                className={`h-7 w-7 cursor-pointer ${
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
                </div>

                <FormField
                  control={reviewForm.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Scrieți recenzia dumneavoastră aici... (minim 20 de caractere)"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-[#00aff5] hover:bg-[#0096d6]" 
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? "Se trimite..." : "Trimite recenzia"}
                </Button>
              </form>
            </Form>
            <Separator className="my-6" />
          </>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {reviews.length > 0 && (
                <>
                  <div className="flex flex-col items-center bg-[#f8f9fa] rounded-lg p-3 mr-2">
                    <span className="text-3xl font-bold text-[#00aff5]">
                      {(reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)}
                    </span>
                    <div className="flex mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {reviews.length} {reviews.length === 1 ? 'recenzie' : 'recenzii'}
                    </span>
                  </div>

                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((num) => {
                      const count = reviews.filter(r => r.rating === num).length;
                      const percentage = (count / reviews.length) * 100;

                      return (
                        <div key={num} className="flex items-center gap-2 mb-1">
                          <span className="text-xs w-4">{num}</span>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-400 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bara de filtrare și sortare */}
          {reviews.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 bg-gray-50 p-3 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {/* Dropdown pentru filtrare */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-9">
                      <Filter size={16} />
                      Filtrează
                      {filterOption !== "all" && (
                        <span className="ml-1 rounded-full bg-[#00aff5] text-white px-2 py-0.5 text-xs">
                          {filterOption}★
                        </span>
                      )}
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuRadioGroup value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
                      <DropdownMenuRadioItem value="all">Toate recenziile</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="5">
                        <div className="flex items-center">
                          <span>5</span>
                          <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                          <span className="ml-2 text-gray-500 text-xs">
                            ({reviews.filter(r => r.rating === 5).length})
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="4">
                        <div className="flex items-center">
                          <span>4</span>
                          <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                          <span className="ml-2 text-gray-500 text-xs">
                            ({reviews.filter(r => r.rating === 4).length})
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="3">
                        <div className="flex items-center">
                          <span>3</span>
                          <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                          <span className="ml-2 text-gray-500 text-xs">
                            ({reviews.filter(r => r.rating === 3).length})
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="2">
                        <div className="flex items-center">
                          <span>2</span>
                          <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                          <span className="ml-2 text-gray-500 text-xs">
                            ({reviews.filter(r => r.rating === 2).length})
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="1">
                        <div className="flex items-center">
                          <span>1</span>
                          <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                          <span className="ml-2 text-gray-500 text-xs">
                            ({reviews.filter(r => r.rating === 1).length})
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dropdown pentru sortare */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-9">
                      <ArrowUpDown size={16} />
                      Sortează
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                      <DropdownMenuRadioItem value="newest">Cele mai noi</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="oldest">Cele mai vechi</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Dropdown pentru numărul de recenzii pe pagină */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Recenzii pe pagină:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-9 min-w-[70px]">
                      {perPage}
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-16">
                    <DropdownMenuRadioGroup value={perPage.toString()} onValueChange={(value) => setPerPage(parseInt(value) as PerPageOption)}>
                      <DropdownMenuRadioItem value="5">5</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="10">10</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="20">20</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="50">50</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {filteredReviews.length > 0 ? (
            <>
              <div className="space-y-6 divide-y">
                {paginatedReviews.map((review) => (
                  <div key={review.id} className="pt-6 first:pt-0">
                    {editingReviewId === review.id ? (
                      // Formular de editare recenzie
                      <div className="border p-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Editați recenzia</h4>
                          <Badge variant="outline" className="text-xs">
                            {review.lastModified ? "Editată" : "Originală"}
                          </Badge>
                        </div>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="rating"
                              render={() => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex space-x-1">
                                      {[1, 2, 3, 4, 5].map((value) => (
                                        <Star
                                          key={value}
                                          className={`h-7 w-7 cursor-pointer ${
                                            (hoveredRating || rating) >= value
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "text-gray-300"
                                          }`}
                                          onMouseEnter={() => setHoveredRating(value)}
                                          onMouseLeave={() => setHoveredRating(0)}
                                          onClick={() => {
                                            setRating(value);
                                            editForm.setValue("rating", value);
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
                              control={editForm.control}
                              name="comment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Scrieți recenzia dumneavoastră aici... (minim 20 de caractere)"
                                      className="resize-none"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex gap-2 justify-end">
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => setEditingReviewId(null)}
                              >
                                Anulează
                              </Button>
                              <Button 
                                type="submit" 
                                className="bg-[#00aff5] hover:bg-[#0096d6]" 
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? "Se salvează..." : "Salvează modificările"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    ) : (
                      // Afișare recenzie
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-[#e6f7ff] flex items-center justify-center mr-3">
                              <User className="h-5 w-5 text-[#00aff5]" />
                            </div>
                            <div>
                              <span className="font-medium block">
                                {review.clientName || "Client"}
                                {review.clientId === currentUserId && (
                                  <span className="text-xs ml-2 text-[#00aff5]">(Tu)</span>
                                )}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(review.createdAt)}
                                {review.lastModified && review.lastModified !== review.createdAt && (
                                  <span className="ml-2 italic">
                                    (Editată: {formatDate(review.lastModified)})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="bg-[#f8f9fa] px-2 py-1 rounded flex items-center">
                              <span className="font-bold text-sm mr-1">{review.rating}</span>
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>

                            {review.clientId === currentUserId && onUpdateReview && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingReviewId(review.id)}
                              >
                                <Edit2 className="h-4 w-4" />
                                <span className="sr-only">Editează</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="ml-13 pl-13">
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

                          <p className="text-gray-700 mb-1">{review.comment}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Paginare */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {generatePaginationLinks().map((link, idx) => (
                        <PaginationItem key={idx}>
                          {link === "ellipsis-start" || link === "ellipsis-end" ? (
                            <PaginationLink disabled>...</PaginationLink>
                          ) : (
                            <PaginationLink 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(link as number);
                              }}
                              isActive={currentPage === link}
                            >
                              {link}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Star className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                {reviews.length === 0 
                  ? "Nu există recenzii încă." 
                  : "Nu există recenzii care să corespundă filtrelor aplicate."}
              </p>
              {filterOption !== "all" && reviews.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setFilterOption("all")}
                >
                  Resetează filtrul
                </Button>
              )}
              {!canReview && reviews.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  Recenziile pot fi lăsate doar de clienții care au interacționat cu acest service.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}