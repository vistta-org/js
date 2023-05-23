import { useRoute } from "@vistta/visttajs";

export default function Home() {
  const { navigate } = useRoute();
  return <>
    <button onClick={() => navigate("/benchmark")}>Benchmark</button>
  </>;
}