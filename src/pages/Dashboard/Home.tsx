import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";
import VideoOpening from "../../components/ecommerce/VideoOpening";

export default function Home() {
  return (
    <>
      <PageMeta
  title="GiStream | Platform Nonton Live Theater JKT48"
  description="GiStream adalah platform unofficial untuk menonton live stream theater JKT48 dengan harga terjangkau, tersedia di Android dan Website, didukung oleh JKT48Connect."
/>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        
        <div className="col-span-12 xl:col-span-5">
          <VideoOpening />
        </div>
        
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </>
  );
}
