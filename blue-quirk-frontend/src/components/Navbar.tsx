import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <Link href="/">
        <span className="text-2xl font-bold text-blue-600">BlueQuirk</span>
      </Link>
      <div className="flex space-x-6">
        <Link href="/products" className="hover:text-blue-500">Products</Link>
        <Link href="/about" className="hover:text-blue-500">About</Link>
        <Link href="/cart" className="hover:text-blue-500">Cart</Link>
      </div>
    </nav>
  );
}
