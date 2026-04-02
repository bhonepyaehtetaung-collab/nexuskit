
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/form";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/table";
import { Textarea } from "./components/textarea";
import { useToast } from "./components/use-toast";

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.preprocess(
    (val) => Number(val),
    z.number().positive({ message: "Price must be a positive number." })
  ),
  image: z.any().optional(),
});

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  payment_slip_url: string | null;
  order_items: any[]; // You might want a more specific type for order items
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("manage-products");
  const [orders, setOrders] = useState<Order[]>([]);
  const supabase = createClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0, 
      image: undefined,
    },
  });

  useEffect(() => {
    if (activeTab === "view-orders") {
      fetchOrders();
    }
  }, [activeTab]);

  async function fetchOrders() {
    try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, total_amount, payment_slip_url");

      if (error) {
        throw error;
      }
      setOrders(data as Order[] || []);
    } catch (error: any) {
      toast({
        title: "Error fetching orders",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }

  async function onSubmit(values: z.infer<typeof productFormSchema>) {
    try {
      let imageUrl = null;

      if (values.image && values.image.length > 0) {
        const file = values.image[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
      }

      const { error } = await supabase.from("products").insert({
        name: values.name,
        description: values.description,
        price: values.price,
        image_url: imageUrl,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Product uploaded successfully.",
        variant: "default",
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Admin Dashboard</h1>

      <div className="w-full max-w-4xl mx-auto">
        <div className="grid w-full grid-cols-2 bg-gray-700 rounded-md p-1 mb-4">
          <button
            onClick={() => setActiveTab("manage-products")}
            className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none ${activeTab === "manage-products" ? "bg-purple-600" : "hover:bg-gray-600"}`}
          >
            Manage Products
          </button>
          <button
            onClick={() => setActiveTab("view-orders")}
            className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none ${activeTab === "view-orders" ? "bg-purple-600" : "hover:bg-gray-600"}`}
          >
            View Orders
          </button>
        </div>

        {activeTab === "manage-products" && (
          <div className="bg-gray-800 border border-gray-700 text-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Upload New Product</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-gray-300">Product Name</FormLabel>
                      <FormControl>
                        <input className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-gray-300">Description</FormLabel>
                      <FormControl>
                        <textarea
                          className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-gray-300">Price</FormLabel>
                      <FormControl>
                        <input
                          className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500"
                          type="number"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-gray-300">Product Image</FormLabel>
                      <FormControl>
                        <input
                          {...fieldProps}
                          className="mt-1 block w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                          type="file"
                          accept="image/*"
                          onChange={(event) => onChange(event.target.files)}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
                <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                  Upload Product
                </button>
              </form>
            </Form>
          </div>
        )}

        {activeTab === "view-orders" && (
          <div className="bg-gray-800 border border-gray-700 text-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Orders</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Slip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No orders found.</TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {order.payment_slip_url ? (
                            <a
                              href={order.payment_slip_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:underline"
                            >
                              View Slip
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
