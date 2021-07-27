const DateTime = luxon.DateTime;
const Duration = luxon.Duration;
const RRule = rrule.RRule;
const startOfDay = DateTime.local().startOf("day").toMillis();

let targetDate = new Date(calcPlannedTime().toISODate());

document.addEventListener("alpine:init", () => {
  Alpine.store("sims", {
    selectedSimulation: "Time-oriented budget",
    simulations: [newSimTime(), newSimMoney()],

    get(selection = this.selectedSimulation) {
      if (this.simulations.filter((x) => x.title === selection)[0])
        return this.simulations.filter((x) => x.title === selection)[0];

      console.warn("Simulation not found");
      return this.simulations[0];
    },
    balance() {
      const sim = this.get();
      const ins = sim.inflows.map((flow) => findTotals(flow));
      const outs = sim.outflows.map((flow) => findTotals(flow));

      console.log(ins.map((flow) => format_total(flow)));
      console.log(outs.map((flow) => format_total(flow)));

      const money_bal = findBalance(ins, outs);
      // console.log(format_total(money_bal));

      return format_total(money_bal);
    },
    add_inflow(account, frequency, duration, price) {
      const sim = this.get();
      sim.inflows.push(a(account, frequency, duration, price));
    },
    add_outflow(account, frequency, duration, price) {
      const sim = this.get();
      sim.outflows.push(a(account, frequency, duration, price));
    },
  });
});

function simpleTime2LuxonDur(simpleTime) {
  if (simpleTime.includes(":")) {
    const dt = DateTime.fromFormat(simpleTime, "h:m").toMillis();
    const dur = Duration.fromMillis(dt - startOfDay);
    // console.log(dur.toFormat("h 'hours' m 'minutes'"));
    return dur;
  }

  if (simpleTime.includes("d")) {
    const dur = Duration.fromObject({ days: parseInt(simpleTime) });
    // console.log(dur.toFormat("d 'days'"));
    return dur;
  }

  const dur = Duration.fromObject({ minutes: parseInt(simpleTime) });
  return dur;
}

function newSimMoney(title = "Money-oriented budget") {
  return {
    title,
    inflows: [a("Work", "every weekday", "8:00", 130)],
    outflows: [a("Rent", "every Month", "0", 500)], // how often do you enjoy your apartment without doing a salient activity
  };
}

function newSimTime(title = "Time-oriented budget") {
  return {
    title,
    inflows: [
      a("Yourseelf", "Every day", "24:00", 0),
      a("Chris", "Every weekday", "8:00", -110), // task delegation
      a("Maurice", "FREQ=DAILY;INTERVAL=2;BYDAY=MO,TU,WE,TH,FR", "4:00", -3),
      a("Maurice", "FREQ=DAILY;INTERVAL=2;BYDAY=MO,TU,WE,TH,FR", "4:00", 5),
    ],
    outflows: [
      a("Sleep", "Every day", "8:00", 5),
      a("Resarch snails", "Every 2 months until Jan 01 2077", "8:00", 50),
      a("Resarch epidemiology", "Every 2 days until Jan 01 2077", "10:00", 5),
      a("Resarch epidemiology", "Every 2 days until Jan 01 2077", "10:00", 51),
    ],
  };
}

function a(account, frequency_, duration_, price_) {
  return {
    account,
    frequency: frequency_.includes("=") ? RRule.fromString(frequency_) : RRule.fromText(frequency_),
    duration: simpleTime2LuxonDur(duration_),
    price: currency(price_),
  };
}

function calcPlannedTime(events) {
  return DateTime.now().plus({
    days: 30 * 365,
    // (sum(events.map((c) => c.duration * c.)) ?? 0) }
  });
}

function findTotals(flow) {
  const { frequency, duration, price } = flow;
  const occurrences = frequency.between(new Date(), targetDate);

  const totals = {
    money: price.multiply(occurrences.length),
    time: Duration.fromMillis(duration * occurrences.length),
  };

  return totals;
}

function format_total(totals) {
  const { money, time } = totals;

  return {
    money: money.format(),
    time: time.toFormat("y 'years' d 'days' h 'hours' m 'minutes'"),
  };
}

function findBalance(ins, outs) {
  const totalTime = ins.map((x) => x.time).reduce((a, b) => a + b, 0);
  const totalTimeUsed = outs.map((x) => x.time).reduce((a, b) => a + b, 0);

  const totalMoney = ins.map((x) => x.money).reduce((a, b) => b.add(a), currency(0.0));
  const totalMoneyUsed = outs.map((x) => x.money).reduce((a, b) => b.add(a), currency(0.0));

  return {
    time: Duration.fromMillis(totalTime - totalTimeUsed),
    money: totalMoney.subtract(totalMoneyUsed),
  };
}

function sortByPower(a, b) {
  const Ta = findTotals(a);
  const Tb = findTotals(b);

  return Ta.money / Ta.time < Tb.money / Tb.time;
}
