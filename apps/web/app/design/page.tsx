import type { Metadata } from 'next';
import { Band, DateNote, Ruler, SectionMark } from '@portrait/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { boardGroups } from '@/lib/routes';
import s from './design.module.css';

export const metadata: Metadata = { title: '目录 · 页面 v2' };

const cast = [
  { name: 'Lin Zhou', meta: '@lin · 化名 quiet-otter', bio: 'UC San Diego 计算机大三，中国留学生。Campus Marketplace 有 2,000 多名同学在用。' },
  { name: 'Maya Ortiz', meta: '@maya · 化名 paper-kite', bio: '交互设计应届生，作品多、案例写得少。人物色 305°。' },
  { name: 'Alex Rivera', meta: '@alex · 化名 night-heron', bio: '从生物实验室转行，自学前端，住在纽约。form-kit 有三家非营利组织在用。' },
  { name: 'Jordan Lee', meta: '在职者 · Fernway', bio: '毕业一年的软件工程师，在支付组；提供 coffee chat 和内推。' },
  { name: 'Northwind', meta: '种子轮 · 6 人 · 旧金山', bio: '给独立餐馆做库存和订货软件。CEO Sam Okafor，CTO Dana Wu（多伦多）。' },
];

/** The canvas index (V2-S00): every artboard, linked to its page. */
export default function DesignIndex() {
  return (
    <div lang="zh-CN" className="relative min-h-screen overflow-hidden pb-24">
      <Ruler />
      <header className="wrap relative pt-16">
        <SectionMark vw={220} d="M2 6 C60 3 140 7 218 4" isNew style={{ top: 70, width: 220 }} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="hand pt-[22px] text-[18px]">
            <Band>v0.2 · Oct 19</Band> <DateNote>身高线的结构 × 晨光的颜色</DateNote>
          </p>
          <ThemeToggle />
        </div>
        <h1 className="t-d mt-[18px]">目录 · 页面 v2</h1>
        <p className="t-body zh c2 mt-3.5 max-w-[50em]">
          所有页面都按 §5A 改过：先一句话，再在原地生长；动效只用一条不回弹的弹簧；每页最多一处小惊喜。点任意一项打开对应的页面；画成夜色的画板会用暗色打开。
        </p>
      </header>

      {boardGroups.map((g) => (
        <section key={g.n} className={`wrap ${s.grp}`}>
          <div className={s.gh}>
            <span className={s.n}>{g.n}</span>
            <h2 className="t-h2">{g.title}</h2>
            {g.note ? <span className="t-s c2 zh">{g.note}</span> : null}
          </div>
          <div className={s.list}>
            {g.items.map((i) => (
              // Plain anchors: a full load lets ?theme= apply before first paint.
              <a key={`${i.k}-${i.t}`} className={s.it} href={i.href}>
                <span className={s.k}>{i.k}</span>
                <span>
                  <span className="t-s b block">{i.t}</span>
                  <span className="t-xs c2 zh">{i.d}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section className={`wrap ${s.grp}`}>
        <div className={s.gh}>
          <span className={s.n}>·</span>
          <h2 className="t-h2">人物表</h2>
          <span className="t-s c2">全部虚构</span>
        </div>
        <div className={s.cast}>
          {cast.map((c) => (
            <div key={c.name}>
              <p className="t-s b">{c.name}</p>
              <p className="t-xs c2">{c.meta}</p>
              <p className="t-xs zh mt-1.5">{c.bio}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
