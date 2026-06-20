export default function Footer({ lang }: { lang: string }) {
  return (
    <footer className="text-gray-800 py-12 mt-0 border-t-1 border-gray-300">
      <div className="container mx-auto text-center">
        <p>© 2026 BlueQuirk. All rights reserved.</p>
        <p>Follow us on 
          <a href="#" className="text-blue-400 ml-1">Facebook</a>, 
          <a href="#" className="text-blue-400 ml-1">Instagram</a>
        </p>
      </div>
    </footer>
  );
}
