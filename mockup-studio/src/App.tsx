import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Editor from './pages/Editor';
import Home from './pages/Home';
import License from './pages/License';
import MyMockups from './pages/MyMockups';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="my-mockups" element={<MyMockups />} />
        <Route path="license" element={<License />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="editor/:id" element={<Editor />} />
    </Routes>
  );
}
