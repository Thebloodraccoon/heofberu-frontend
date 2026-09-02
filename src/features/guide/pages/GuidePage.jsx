export default function GuidePage() {
  return (
    <div className="guide-container">
      <header className="text-center">
        <h1 className="guide-title">
          Руководство по Хеофберу
        </h1>
        <div className="ornate-rule mx-auto mt-4 max-w-md">
          <span aria-hidden className="text-sm">✦</span>
        </div>
        <p className="mt-4 guide-subtitle">
          Первое в жанре диахронического мифопоэтического фэнтези вторичного мира
        </p>
      </header>

      <section className="guide-section">
        <h2 className="guide-heading">Предисловие</h2>

        <p className="guide-text">
          <strong className="guide-strong">HEOFBERU</strong> — это масштабная вымышленная вселенная, служащая ареной для сюжетов в жанре историогенетического фэнтези.
        </p>

        <blockquote className="guide-quote">
          <p className="guide-text">
            <strong>Происхождение названия:</strong> Имя мира образовано от староанглийских корней: <em>Heof</em> (от <em>heofon</em> — небо) и <em>-beru</em> (от <em>beran</em> — нести). Буквальное значение — «Небоносная Мать» или «Союз Неба и Земли».
          </p>
        </blockquote>

        <p className="guide-text">
          <strong className="guide-strong">Историогенетическое фэнтези</strong> — это направление, в котором вторичный мир предстает как живая, развивающаяся система. <em>Почему именно «историогенетическое»?</em> Этот термин подчеркивает главную суть: мир не просто обладает историей — он непрерывно ею порождается.
        </p>

        <p className="guide-text">
          Прошлое здесь — это не декоративный фон и не сборник легенд, а активная сила, напрямую определяющая законы настоящего. Ни один элемент этого мира не задается в готовом виде. На протяжении эпох под влиянием внутренних причин возникают, смешиваются и исчезают:
        </p>

        <ul className="guide-list">
          <li className="guide-list-item">Космология и законы магии;</li>
          <li className="guide-list-item">Разумные виды и языковые семьи;</li>
          <li className="guide-list-item">Религии и мифологические системы;</li>
          <li className="guide-list-item">Политические институты, технологии и хозяйство.</li>
        </ul>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Как создаётся мир</h2>

        <p className="guide-text">
          Архитектура Хеофберу выстраивается строго последовательно. Мир выводится из начальных условий по принципу домино, где каждый следующий этап — неизбежное историческое следствие предыдущего. Весь процесс историогенеза делится на четыре ключевые макро-фазы:
        </p>

        <div className="guide-ordered mt-6 space-y-6">

          {/* Этап 1 */}
          <div className="pl-4 border-l-2 border-stone-600">
            <h3 className="guide-subtitle font-bold text-stone-100 mb-2">
              I. Фундамент мироздания
            </h3>
            <p className="guide-text text-stone-300">
              Космогония <span className="text-stone-500">→</span> Устройство магии <span className="text-stone-500">→</span> Происхождение жизни
            </p>
          </div>

          {/* Этап 2 */}
          <div className="pl-4 border-l-2 border-stone-600">
            <h3 className="guide-subtitle font-bold text-stone-100 mb-2">
              II. Антропогенез и Культура
            </h3>
            <p className="guide-text text-stone-300">
              Формирование разумных видов <span className="text-stone-500">→</span> Расселение <span className="text-stone-500">→</span> Языковые семьи <span className="text-stone-500">→</span> Мифологические системы
            </p>
          </div>

          {/* Этап 3 */}
          <div className="pl-4 border-l-2 border-stone-600">
            <h3 className="guide-subtitle font-bold text-stone-100 mb-2">
              III. Цивилизация и Институты
            </h3>
            <p className="guide-text text-stone-300">
              Хозяйство <span className="text-stone-500">→</span> Металлургия <span className="text-stone-500">→</span> Государства <span className="text-stone-500">→</span> Религиозные реформы <span className="text-stone-500">→</span> Империи
            </p>
          </div>

          {/* Этап 4 */}
          <div className="pl-4 border-l-2 border-stone-600">
            <h3 className="guide-subtitle font-bold text-stone-100 mb-2">
              IV. Цикл обновления
            </h3>
            <p className="guide-text text-stone-300">
              Катастрофа <span className="text-stone-500">→</span> Остаточная память <span className="text-stone-500">→</span> Перерождение мира
            </p>
          </div>

        </div>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Характерные черты</h2>

        {/* Блок 1: Конфликт и масштаб */}
        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mt-4 mb-2">
          Бремя прошлого и масштаб истории
        </h3>
        <p className="guide-text mb-3">
          <strong className="guide-strong">Центральный конфликт:</strong> сохранение против изменения.
        </p>
        <ul className="guide-list-disc pl-5 mb-4">
          <li>
            Персонажи живут среди последствий процессов, начавшихся задолго до их рождения. Они считают свой мир естественным, но постепенно обнаруживают, что его законы, религии и конфликты являются результатами древних решений, ошибок и катастроф.
          </li>
          <li>
            Ни одна сторона не обладает полной правотой, но некоторые решения остаются лучше других. Истина разделена между противниками, а каждое жизнеспособное будущее требует цены.
          </li>
          <li>
            Здесь масштаб важнее отдельного героя, потому что человек входит в историю уже начатой и покидает её незавершённой. Персонаж здесь не автор истории, а точка, в которой история приобретает волю, голос и лицо.
          </li>
        </ul>

        {/* Блок 2: Традиции */}
        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mt-6 mb-2">
          Эрозия традиций
        </h3>
        <p className="guide-text mb-3">
          <strong className="guide-strong">Чем древнее традиция, тем менее она должна быть цельной и однозначной.</strong> Из-за этого в мире сосуществуют:
        </p>
        <ul className="guide-list-disc pl-5 mb-4">
          <li>Родственные божества под разными именами и чужие боги, включённые в местный пантеон;</li>
          <li>Исторические правители, превращённые в мифических существ;</li>
          <li>Религиозные термины, утратившие первоначальный смысл;</li>
          <li>Священные тексты, написанные на языке, который жрецы уже понимают неправильно;</li>
          <li>Политически удобные реконструкции прошлого;</li>
          <li>Ложные этимологии, ставшие основой реального обряда.</li>
        </ul>

        {/* Блок 3: Инструменты и законы мира */}
        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mt-6 mb-2">
          Анатомия реализма
        </h3>
        <p className="guide-text mb-3">
          В качестве инструментов для моделирования независимого мира используются: <em className="text-stone-300">сравнительная история, антропология, лингвистика, теология, культурология и спекулятивная биология</em>. Всякая земная аналогия пропускается через условия мира и интерпретируется в соответствии с ними:
        </p>
        <ul className="guide-list-disc pl-5">
          <li>
            <strong className="guide-strong">Магия</strong> меняет не только сражения, но и хозяйство, расселение, право, медицину, транспорт, демографию и способы передачи власти.
          </li>
          <li>
            <strong className="guide-strong">Языки</strong> разделяются, смешиваются, заимствуют слова, сохраняют архаизмы и меняют значения старых терминов.
          </li>
          <li>
            <strong className="guide-strong">Религии</strong> проходят через реформы, расколы, локальные культы, политическое присвоение, демонизацию прежних богов и переосмысление мифов.
          </li>
          <li>
            <strong className="guide-strong">Народы</strong> — это общества, что дробятся на культуры, классы, государства, конфессии и исторические партии.
          </li>
          <li>
            <strong className="guide-strong">Технология</strong> зависит от ресурсов. Отсутствие доступного железа, например, должно влиять не только на мечи, но и на земледельческие инструменты, строительство, стоимость труда, транспорт, осадное дело, кораблестроение, налоговую систему и способность государства вооружать большие армии.
          </li>
          <li>
            <strong className="guide-strong">Наследие катастроф:</strong> Катастрофа и перерождение оставляют наследство. После гибели мира сохраняются языковые субстраты, изменённые виды, табу, руины, болезни, ритуальные формулы, политические архетипы и неверно понятые воспоминания.
          </li>
        </ul>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Почему нет «хороших» фракций?</h2>

        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mt-4 mb-2">
          Фракция как ответ на угрозу
        </h3>
        <p className="guide-text mb-3">
          В мире Хеофберу любая фракция изначально формируется как реакция на конкретную историческую проблему. То, что в настоящем кажется жестокостью, в прошлом могло быть единственным способом выжить:
        </p>
        <ul className="guide-list-disc pl-5 mb-4">
          <li>
            <strong className="guide-strong">Военная империя</strong> могла возникнуть потому, что только централизованная армия остановила уничтожение нескольких народов. Через три столетия та же система продолжает собирать чрезмерные налоги, подавлять местные языки и считать любое неповиновение угрозой существованию мира.
          </li>
          <li>
            <strong className="guide-strong">Жреческий союз</strong> мог сохранить знания после катастрофы, но позже превращает право на хранение знаний в абсолютную монополию на истину.
          </li>
          <li>
            <strong className="guide-strong">Городская республика</strong> может защищать свободу от наследственной знати, одновременно строя благосостояние на долговом рабстве провинций.
          </li>
          <li>
            <strong className="guide-strong">Освободительное движение</strong> может справедливо бороться против империи, но его победа способна привести к распаду дорог, ирригации, общей обороны и продовольственного обмена.
          </li>
        </ul>

        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mt-6 mb-2">
          Анатомия исторической правоты
        </h3>
        <p className="guide-text mb-3">
          Таким образом, фракция может быть права в своём первоначальном диагнозе или в отношении конкретного врага. Она может быть необходима в определённую эпоху, но стать преступной в своих средствах и смертельно опасной после исчезновения породившей её угрозы.
        </p>
        <p className="guide-text mb-3">
          «Хорошая фракция» обычно возникает там, где автор заранее назначает одну ценность абсолютной. В Хеофберу подобная привилегия отсутствует. Исторически убедительная фракция не спрашивает: «Добрая ли я?». Она задает совершенно иной вопрос:
        </p>
        <blockquote className="guide-quote border-l-2 border-[#a8853d] pl-4 mb-4 mt-2">
          <p className="guide-text font-bold text-stone-100 italic">
            «Что должно сохраниться любой ценой?»
          </p>
        </blockquote>
        <p className="guide-text mb-5">
          Именно ответ на этот вопрос одновременно создаёт её главное достоинство и её же самое страшное преступление.
        </p>

        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mt-6 mb-2">
          Моральная асимметрия
        </h3>
        <p className="guide-text mb-3">
          Можно подумать, что в таком мире все фракции одинаково плохи. Отнюдь. Отсутствие абсолютно хорошей стороны не означает моральной симметрии. Одна сторона может проводить массовое уничтожение, а другая — лишь защищать собственные города. Одна может сознательно лгать, другая — искренне ошибаться. Одна может допускать спасительные реформы, а другая — считать любое изменение наказуемой ересью.
        </p>
        <p className="guide-text mb-3">
          Между ними существует реальная нравственная разница. Если её убрать, мир превратится не в сложный, а в циничный. Если «все чудовища, и никакой выбор не имеет значения», история полностью лишается этического напряжения. <strong className="guide-strong">Ни одна сторона не обладает полной правотой, но некоторые решения всегда остаются лучше других.</strong>
        </p>
        <p className="guide-text mb-5">
          Читатель должен иметь возможность осудить резню, рабство, предательство или сознательное уничтожение народа. Однако он не должен получать готовую, «стерильную» фракцию, которая автоматически права во всех вопросах.
        </p>

        <div className="mt-6 p-5 bg-stone-800/40 rounded-lg text-center border border-stone-600/30">
          <p className="guide-heading text-xl text-stone-100 uppercase tracking-wider">
            Мораль существует.<br/>Монополии на мораль — нет.
          </p>
        </div>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Почему нет правильной стороны</h2>

        <p className="guide-text mb-4">
          Потому что стороны отвечают не на один и тот же вопрос. Все они способны рассуждать рационально, но их рациональности основаны на разных масштабах, сроках и ценностях.
        </p>

        {/* Блок с вопросами фракций */}
        <div className="guide-answers pl-4 border-l-2 border-[#a8853d]/50 mb-6">
          <p className="guide-text"><strong className="guide-strong">Для приграничного князя</strong> главным вопросом является «Как пережить следующую зиму и набег?»</p>
          <p className="guide-text"><strong className="guide-strong">Для имперского чиновника</strong> — «Как удержать дороги, налоги и набор войск на территории в несколько тысяч километров?»</p>
          <p className="guide-text"><strong className="guide-strong">Для местного жреца</strong> — «Как не допустить разрушения ритуала, который, возможно, действительно удерживает опасную силу?»</p>
          <p className="guide-text"><strong className="guide-strong">Для крестьянина</strong> — «Кто не заберёт последнее зерно?»</p>
          <p className="guide-text"><strong className="guide-strong">Для торгового города</strong> — «Кто обеспечит движение караванов?»</p>
          <p className="guide-text"><strong className="guide-strong">Для восставшего народа</strong> — «Зачем сохранять порядок, в котором мы всегда остаёмся подчинёнными?»</p>
        </div>

        {/* Блок про неполноту информации */}
        <p className="guide-text mb-3">
          Правильной стороны нет ещё и потому, что никто не располагает полной информацией. Существа внутри мира, в отличие от нас, не обладают полной картиной мира. Они живут среди:
        </p>
        <ul className="guide-list-disc pl-5 mb-5">
          <li>Неполных летописей и политически исправленных мифов;</li>
          <li>Ошибочных переводов и религиозных догматов;</li>
          <li>Местной памяти, слухов и намеренной пропаганды;</li>
          <li>Травм прошлого;</li>
          <li>Реальных сверхъестественных явлений, смысл которых остаётся спорным.</li>
        </ul>

        {/* Финальный вывод */}
        <p className="guide-text mb-3">
          Одна сторона может правильно видеть непосредственную угрозу, но ошибаться в её происхождении. Другая может понимать прошлое, но недооценивать настоящее. Третья может обладать истинным знанием и использовать его ради господства.
        </p>
        <p className="guide-text">
          <strong className="guide-strong text-lg">Истина в таком мире не принадлежит стороне целиком, она распределена между врагами.</strong>
        </p>
      </section>

            <section className="guide-section">
        <h2 className="guide-heading">Почему масштаб важнее отдельного персонажа</h2>

        <p className="guide-text mb-4">
          Точнее будет сказать: масштаб важнее персонажа как окончательного объяснения мира. В обычном героическом фэнтези история часто устроена так: Герой принимает верное решение и меняет судьбу мира.
        </p>

        <p className="guide-text mb-3">
          В историогенетическом фэнтези даже великий правитель, пророк или завоеватель действует внутри процессов, начавшихся задолго до его рождения:
        </p>

        {/* Длинный список разбит на две колонки для компактности */}
        <ul className="guide-list-disc pl-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <li>климатического сдвига;</li>
          <li>истощения ресурсов;</li>
          <li>переселения народов;</li>
          <li>распада языковой общности;</li>
          <li>религиозного раскола;</li>
          <li>изменения торговых путей;</li>
          <li>магической катастрофы;</li>
          <li>демографического кризиса;</li>
          <li>развития нового оружия;</li>
          <li>накопленного противоречия между центром и окраинами.</li>
        </ul>

        <p className="guide-text mb-6">
          Персонаж может ускорить процесс, изменить его форму, отложить катастрофу или направить насилие в другую сторону. Но он редко создаёт историческую ситуацию из ничего.
        </p>

        {/* Блок с примерами */}
        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mb-3">
          Иллюзия единоличного творца
        </h3>
        <div className="space-y-4 border-l-2 border-[#a8853d]/50 pl-4 mb-6">
          <p className="guide-text">
            <strong className="guide-strong">Император</strong> не «создаёт империю» одним указом. До него должны существовать дороги, налоговый аппарат, военная знать, политический язык единства, престиж центральной власти и страх перед распадом.
          </p>
          <p className="guide-text">
            <strong className="guide-strong">Пророчица</strong> не «создаёт религию» одной проповедью. Её должны услышать люди, уже разочарованные старым культом и способные выразить новый опыт через знакомые сакральные категории.
          </p>
          <p className="guide-text">
            <strong className="guide-strong">Революционер</strong> не «начинает революцию» одной речью. Речь становится значимой потому, что общество уже накопило долги, унижения, новые формы связи и группы, готовые действовать вместе.
          </p>
        </div>

        <p className="guide-text text-center text-lg mt-6">
          <strong className="guide-strong">
            Поэтому персонаж здесь не автор истории, а точка, в которой история приобретает волю, голос и лицо.
          </strong>
        </p>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Зачем тогда нужны персонажи?</h2>

        <p className="guide-text mb-4">
          Чтобы масштаб не превратился в сухую хронику. Мир может существовать миллионы лет, но читатель воспринимает его через одну смерть, один брак, один переход границы, одну нарушенную клятву, один отказ исполнить приказ.
        </p>

        <p className="guide-text mb-3">
          Персонаж необходим не для того, чтобы быть важнее мира, а для того, чтобы показать цену мировых процессов:
        </p>

        <ul className="guide-list-disc pl-5 mb-6 space-y-2">
          <li>
            <strong className="guide-strong">Война империй</strong> сама по себе является схемой. <strong className="guide-strong">Солдат</strong>, вынужденный сжечь деревню своей матери, превращает её в трагедию.
          </li>
          <li>
            <strong className="guide-strong">Религиозный раскол</strong> является историческим процессом. <strong className="guide-strong">Жрица</strong>, которая должна признать сестру еретичкой, показывает его человеческий смысл.
          </li>
          <li>
            <strong className="guide-strong">Распад языка</strong> является лингвистическим изменением. <strong className="guide-strong">Старик</strong>, которого внук уже не понимает без переводчика, делает его переживаемым.
          </li>
        </ul>

        <blockquote className="guide-quote border-l-2 border-[#a8853d] pl-4 py-1 mb-4 mt-2 bg-stone-800/30 rounded-r-md">
          <p className="guide-text mb-1">
            Масштаб отвечает на вопрос: <em className="text-stone-300">Почему это произошло?</em>
          </p>
          <p className="guide-text">
            Персонаж отвечает: <em className="text-stone-300">Что это сделало с живым человеком?</em>
          </p>
        </blockquote>

        <p className="guide-text text-center mt-5">
          <strong className="guide-strong text-lg">Нельзя выбирать между ними.</strong><br/>
          Историогенетическое фэнтези работает только тогда, когда личное и историческое постоянно давят друг на друга.
        </p>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Почему герой не может окончательно «исправить мир»</h2>

        <p className="guide-text mb-4">
          Потому что большинство великих проблем являются не ошибками одного злодея, а столкновением жизнеспособных систем. Можно убить тирана, но как одним ударом устранить:
        </p>

        <ul className="guide-list-disc pl-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <li>зависимость государства от налогов;</li>
          <li>конфликт кочевников и земледельцев за землю;</li>
          <li>дефицит металла;</li>
          <li>разницу между имперским законом и местным обычаем;</li>
          <li>память о старой резне;</li>
          <li>несовместимые представления о священном;</li>
          <li>необходимость выбирать между безопасностью и автономией.</li>
        </ul>

        <h3 className="guide-subtitle font-bold text-lg text-stone-100 mb-3">
          Иллюзия простых решений
        </h3>
        <p className="guide-text mb-3">
          Победа героя меняет распределение сил, но не отменяет причин конфликта.
        </p>

        <div className="space-y-3 border-l-2 border-stone-600 pl-4 mb-5">
          <p className="guide-text">
            Он может <strong className="guide-strong">уничтожить старую империю</strong>, но после этого возникнет вопрос, кто охраняет дороги и платит гарнизонам.
          </p>
          <p className="guide-text">
            Он может <strong className="guide-strong">разоблачить ложь жрецов</strong>, но после этого общество останется без общего языка смерти, брака, клятвы и легитимности.
          </p>
          <p className="guide-text">
            Он может <strong className="guide-strong">освободить провинцию</strong>, но после этого разные группы внутри неё начнут спорить о том, кому принадлежит освобождённая земля.
          </p>
        </div>

        <p className="guide-text">
          Это не означает, что действия бесполезны, напротив, они становятся серьёзнее. Герой выбирает не между «спасти мир» и «уничтожить мир», а между несколькими будущими, каждое из которых имеет цену.
        </p>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Основной конфликт жанра</h2>

        <p className="guide-text mb-4">
          Центральным конфликтом такого фэнтези становится не добро против зла, а <strong className="guide-strong text-lg">Сохранение против изменения</strong>, где обе стороны внутренне раздваиваются:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-stone-800/40 p-4 rounded-lg border border-stone-700">
            <h3 className="guide-subtitle font-bold text-stone-100 mt-0 mb-2">Сохранение</h3>
            <p className="guide-text text-sm mb-2">Может означать:</p>
            <p className="guide-text text-stone-300">защиту культуры; верность мёртвым; непрерывность закона; удержание мира от распада;</p>
            <p className="guide-text text-sm mt-3 mb-2">— и одновременно:</p>
            <p className="guide-text text-stone-300">застой; подавление; наследственную привилегию; сакрализацию старого насилия.</p>
          </div>

          <div className="bg-stone-800/40 p-4 rounded-lg border border-stone-700">
            <h3 className="guide-subtitle font-bold text-stone-100 mt-0 mb-2">Изменение</h3>
            <p className="guide-text text-sm mb-2">Может означать:</p>
            <p className="guide-text text-stone-300">освобождение; реформу; возможность новой жизни; отказ от древней несправедливости;</p>
            <p className="guide-text text-sm mt-3 mb-2">— и одновременно:</p>
            <p className="guide-text text-stone-300">потерю памяти; разрушение работающих институтов; массовое насилие; освобождение сил, которые прежний порядок действительно сдерживал.</p>
          </div>
        </div>

        <p className="guide-text text-center">
          Отсюда возникает настоящая трагедия: <strong className="guide-strong">противники могут одинаково ясно видеть разные части реальности.</strong>
        </p>
      </section>

      <section className="guide-section">
        <h2 className="guide-heading">Временной масштаб</h2>

        <p className="guide-text mb-4">
          Временной масштаб уничтожает окончательную правоту:
        </p>

        <ul className="guide-list-tight pl-4 border-l-2 border-stone-600 mb-6 space-y-3">
          <li className="relative"><span className="absolute -left-[23px] text-stone-500">•</span> На коротком промежутке решение может быть очевидно правильным.</li>
          <li className="relative"><span className="absolute -left-[23px] text-stone-500">•</span> Через десять лет это может выглядеть необходимым.</li>
          <li className="relative"><span className="absolute -left-[23px] text-stone-500">•</span> Через сто лет временная мера превращается в традицию.</li>
          <li className="relative"><span className="absolute -left-[23px] text-stone-500">•</span> Через тысячу лет её происхождение забыто, но запрет остаётся священным.</li>
          <li className="relative"><span className="absolute -left-[23px] text-stone-500">•</span> Через пять тысяч лет потомки угнетённых и угнетателей пересказывают событие противоположными мифами.</li>
        </ul>

        <p className="guide-text mb-4">
          Поэтому одна и та же сторона может быть: спасителем в момент основания; хранителем в следующую эпоху; угнетателем в период зрелости; препятствием перед неизбежной реформой; трагически необходимым остатком после нового катаклизма.
        </p>

        <p className="guide-text text-center text-lg">
          <strong className="guide-strong">Фракции не имеют постоянной нравственной сущности. Они имеют биографию.</strong>
        </p>
      </section>

      <section className="guide-section border-t-4 border-t-[#a8853d]">
        <h2 className="guide-heading">Три принципа</h2>

        <ol className="guide-ordered list-decimal pl-5 mt-4 space-y-5">
          <li>
            <strong className="guide-strong text-stone-100">Хорошими бывают поступки, а не фракции.</strong>
            <br/><span className="text-stone-300">Организация может создавать более справедливые законы, защищать слабых или останавливать войну, но это не делает её носителем вечного добра.</span>
          </li>
          <li>
            <strong className="guide-strong text-stone-100">Исторический масштаб объясняет, личный масштаб судит.</strong>
            <br/><span className="text-stone-300">История объясняет, почему империя совершила преступление. Персонажи и читатель всё равно имеют право назвать его преступлением. Объяснение не является оправданием.</span>
          </li>
          <li>
            <strong className="guide-strong text-stone-100">Выбор должен менять будущее, но не отменять историю.</strong>
            <br/><span className="text-stone-300">Решение героя важно, если после него мир действительно становится другим, но оно не должно магически разрешать все накопившиеся противоречия.</span>
          </li>
        </ol>
      </section>
    </div>
  )
}
