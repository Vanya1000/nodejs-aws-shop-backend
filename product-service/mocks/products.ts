interface Product {
  id: string | undefined;
  title: string;
  description: string;
  price: number;
  count: number;
}

export const products: Product[] = [
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    title: "Dell XPS 13",
    description: "13-inch ultrabook with Intel i7, 16GB RAM, and 512GB SSD.",
    price: 1200,
    count: 15
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
    title: "MacBook Air M2",
    description: "Apple MacBook Air with M2 chip, 8GB RAM, and 256GB SSD.",
    price: 999,
    count: 15
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
    title: "HP Spectre x360",
    description: "13-inch convertible laptop with Intel i7, 16GB RAM, 1TB SSD.",
    price: 1350,
    count: 15
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
    title: "Lenovo ThinkPad X1 Carbon",
    description: "Business ultrabook with Intel i7, 16GB RAM, and 512GB SSD.",
    price: 1450,
    count: 15
  },
  {
    id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
    title: "ASUS ZenBook 14",
    description: "14-inch ultrabook with Intel i5, 8GB RAM, and 512GB SSD.",
    price: 899,
    count: 15
  },
  {
    id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
    title: "Acer Swift 3",
    description: "Budget-friendly laptop with Ryzen 5, 8GB RAM, and 256GB SSD.",
    price: 649,
    count: 15
  },
];
